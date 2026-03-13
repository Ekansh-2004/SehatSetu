import { NextRequest, NextResponse } from 'next/server';
import { detectMedicalEntities } from '@/lib/comprehend-medical';
import { searchMultipleMuscles } from '@/lib/muscle-search';
import { fetchImageFromS3, generatePresignedUrl, checkS3ImageExists } from '@/lib/s3-client';
import { getS3Config } from '@/lib/s3-config';
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

    // Get AWS Comprehend Medical entities
    console.log('🏥 Calling AWS Comprehend Medical...');
    const awsEntities = await detectMedicalEntities(text);
    console.log('✅ AWS entities found:', awsEntities.length);

    // Extract entity texts for direct Qdrant search
    const entityTexts = awsEntities.map(entity => entity.Text.trim().toLowerCase());
    console.log('🎯 Entity texts for Qdrant search:', entityTexts);

    // Search Qdrant directly with AWS entity texts
    let qdrantResults: QdrantResult[] = [];
    if (entityTexts.length > 0) {
      console.log('🗄️ Searching Qdrant database for AWS entities...');
      const searchResult = await searchMultipleMuscles(entityTexts);
      qdrantResults = searchResult.success ? searchResult.results : [];
      console.log('✅ Qdrant search completed:', qdrantResults.length, 'matches found');
    } else {
      console.log('⏭️ No AWS entities found, skipping Qdrant search');
    }

    // Filter results by confidence (keep matches with score > 0.5)
    const goodMatches = qdrantResults.filter(result => result.score > 0.5);
    console.log('🎯 Good confidence matches:', goodMatches.length);

    // Process images for good matches based on configuration
    const s3Config = getS3Config();
    
    for (const match of goodMatches) {
      if (match['Image URL']) {
        console.log('🖼️ Processing image for:', match.muscle_name);
        
        // Check if image exists first (if enabled in config)
        if (s3Config.checkImageExists) {
          const imageExists = await checkS3ImageExists(match['Image URL']);
          if (!imageExists) {
            console.log('❌ Image does not exist in S3:', match['Image URL']);
            continue;
          }
        }
        
        // Process based on configured delivery method
        switch (s3Config.imageDeliveryMethod) {
          case 'presigned':
            const presignedUrl = await generatePresignedUrl(match['Image URL'], s3Config.presignedUrlExpiry);
            if (presignedUrl) {
              match.presignedUrl = presignedUrl;
              console.log('✅ Presigned URL generated for:', match.muscle_name);
            }
            break;
            
          case 'base64':
            const imageData = await fetchImageFromS3(match['Image URL']);
            if (imageData) {
              match.imageData = imageData;
              console.log('✅ Base64 image data fetched for:', match.muscle_name);
            }
            break;
            
          case 'both':
            // Generate both presigned URL and base64 data
            const presignedUrlBoth = await generatePresignedUrl(match['Image URL'], s3Config.presignedUrlExpiry);
            if (presignedUrlBoth) {
              match.presignedUrl = presignedUrlBoth;
              console.log('✅ Presigned URL generated for:', match.muscle_name);
            }
            
            const imageDataBoth = await fetchImageFromS3(match['Image URL']);
            if (imageDataBoth) {
              match.imageData = imageDataBoth;
              console.log('✅ Base64 image data fetched for:', match.muscle_name);
            }
            break;
        }
      }
    }

    // Extract muscle terms for highlighting (from good matches)
    const muscleTermsForHighlighting = goodMatches.map(result => {
      // Skip if muscle_name is undefined
      if (!result.muscle_name) {
        return null;
      }
      
      // Use the original AWS entity text that led to this match
      const matchingEntity = awsEntities.find(entity => 
        entity.Text.toLowerCase().includes(result.muscle_name!.toLowerCase()) ||
        result.muscle_name!.toLowerCase().includes(entity.Text.toLowerCase())
      );
      return matchingEntity ? matchingEntity.Text : result.muscle_name;
    }).filter(Boolean);

    console.log('🎯 Final muscle terms for highlighting:', muscleTermsForHighlighting);

    return NextResponse.json({ 
      awsEntities, 
      muscleTerms: muscleTermsForHighlighting,
      qdrantResults: qdrantResults, // Return all results with scores
      goodMatches: goodMatches // Separate good matches for modal (now with imageData)
    });
  } catch (error) {
    console.error('❌ Error in highlight-muscles API:', error);
    return NextResponse.json({ 
      error: 'Failed to process text',
      awsEntities: [],
      muscleTerms: [],
      qdrantResults: [],
      goodMatches: []
    }, { status: 500 });
  }
} 