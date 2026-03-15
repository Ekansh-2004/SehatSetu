import { NextRequest, NextResponse } from 'next/server';
import { detectMedicalEntities } from '@/lib/comprehend-medical';
import { searchMultipleMuscles } from '@/lib/muscle-search';
import { fetchImageFromS3, generatePresignedUrl, checkS3ImageExists } from '@/lib/s3-client';
import { MUSCLE_TERMS } from '@/lib/constants';

interface QdrantResult {
  score: number;
  muscle_name?: string;
  'Image URL'?: string;
  presignedUrl?: string;
  imageData?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 });

    console.log('🔍 Starting muscle highlighting for text:', text.substring(0, 100) + '...');

    // Detect medical entities via LLM
    console.log('🏥 Detecting medical entities...');
    const medicalEntities = await detectMedicalEntities(text);
    console.log('✅ Medical entities found:', medicalEntities.length);

    // Extract entity texts for direct Qdrant search
    const entityTexts = medicalEntities.map(entity => entity.Text.trim().toLowerCase());
    console.log('🎯 Entity texts for Qdrant search:', entityTexts);

    // Search Qdrant directly with entity texts
    let qdrantResults: QdrantResult[] = [];
    if (entityTexts.length > 0) {
      console.log('🗄️ Searching Qdrant database for medical entities...');
      const searchResult = await searchMultipleMuscles(entityTexts);
      qdrantResults = searchResult.success ? searchResult.results : [];
      console.log('✅ Qdrant search completed:', qdrantResults.length, 'matches found');
    } else {
      console.log('⏭️ No medical entities found, skipping Qdrant search');
    }

    // Filter results by confidence (keep matches with score > 0.5)
    const goodMatches = qdrantResults.filter(result => result.score > 0.5);
    console.log('🎯 Good confidence matches:', goodMatches.length);

    // Process images for good matches
    
    for (const match of goodMatches) {
      if (match['Image URL']) {
        console.log('🖼️ Processing image for:', match.muscle_name);
        
        // Check if image exists first
        const imageExists = await checkS3ImageExists(match['Image URL']);
        if (!imageExists) {
          console.log('❌ Image does not exist:', match['Image URL']);
          continue;
        }
        
        // Generate URL for the image
        const presignedUrl = await generatePresignedUrl(match['Image URL'], 3600);
        if (presignedUrl) {
          match.presignedUrl = presignedUrl;
          console.log('✅ URL generated for:', match.muscle_name);
        }
      }
    }

    // Extract muscle terms for highlighting (from good matches)
    const muscleTermsForHighlighting = goodMatches.map(result => {
      // Skip if muscle_name is undefined
      if (!result.muscle_name) {
        return null;
      }
      
      // Use the original entity text that led to this match
      const matchingEntity = medicalEntities.find(entity => 
        entity.Text.toLowerCase().includes(result.muscle_name!.toLowerCase()) ||
        result.muscle_name!.toLowerCase().includes(entity.Text.toLowerCase())
      );
      return matchingEntity ? matchingEntity.Text : result.muscle_name;
    }).filter(Boolean);

    console.log('🎯 Final muscle terms for highlighting:', muscleTermsForHighlighting);

    return NextResponse.json({ 
      awsEntities: medicalEntities, 
      muscleTerms: muscleTermsForHighlighting,
      qdrantResults: qdrantResults, // Return all results with scores
      goodMatches: goodMatches // Separate good matches for modal
    });
  } catch (error) {
    console.error('❌ Error in highlight-muscles API:', error);
    return NextResponse.json({ 
      error: 'Failed to process text',
      awsEntities: [],  // kept for API backward compatibility
      muscleTerms: [],
      qdrantResults: [],
      goodMatches: []
    }, { status: 500 });
  }
} 