import { NextRequest, NextResponse } from 'next/server';
import { qdrantClient } from '@/lib/qdrant-client';
import { encodeText } from '@/lib/sentence-encoder';
import { generatePresignedUrl, checkS3ImageExists } from '@/lib/s3-client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ muscleName: string }> }) {
  const { muscleName } = await params;
  console.log('🔍 Muscle info API called for:', muscleName);
  
  if (!muscleName) {
    console.log('❌ No muscle name provided');
    return NextResponse.json({ error: 'No muscle name provided' }, { status: 400 });
  }

  try {
    console.log('🔍 Searching Qdrant for muscle:', muscleName);
    
    // Check if qdrantClient is available
    if (!qdrantClient) {
      console.error('❌ Qdrant client is not available');
      throw new Error('Qdrant client not initialized');
    }
    // Use the muscleName as the vector for Qdrant search
    // If your Qdrant setup expects an embedding, you would generate it here.
    // For this prompt, we use [muscleName] as a single-element vector.
    // Use a proper embedding for the muscle name instead of a string vector.
    // For example, using OpenAI's embedding API (or your own embedding function).
    // Here is a placeholder for an async embedding function:
     // You must implement this

    const vector2 = await encodeText(muscleName);
    // Search Qdrant for the muscle (exact match)
    const searchResult = await qdrantClient.search('muscles_cyro', {
      vector: vector2,
      filter: {
  
      },
      limit: 1
    });

    console.log('🔍 Qdrant search result:', searchResult);

    if (!searchResult || searchResult.length === 0) {
      console.log('❌ No muscle found in Qdrant for:', muscleName);
      return NextResponse.json({ 
        imageUrl: '', 
        description: `No detailed information available for ${muscleName}. This is a muscle term that was detected in your conversation.` 
      });
    }

    const muscle = searchResult[0].payload as Record<string, unknown>;
    console.log('🔍 Found muscle data:', muscle);
    
    const description = (muscle.description as string) || `Information about ${muscleName}`;
    
    // Process S3 image if available
    let imageUrl = '';
    let presignedUrl = '';
    const imageData = '';
    
    if (muscle.s3_url || muscle['Image URL']) {
      const s3Url = (muscle.s3_url || muscle['Image URL']) as string;
      console.log('🖼️ Processing S3 image:', s3Url);
      
      // Check if image exists
      const imageExists = await checkS3ImageExists(s3Url);
      if (imageExists) {
        // Generate presigned URL (recommended approach)
        presignedUrl = await generatePresignedUrl(s3Url, 3600); // 1 hour expiry
        
        // Optionally fetch base64 data (choose one approach)
        // imageData = await fetchImageFromS3(s3Url);
        
        imageUrl = presignedUrl || s3Url; // Use presigned URL if available, fallback to original
        console.log('✅ Image processed successfully');
      } else {
        console.log('❌ Image does not exist in S3');
      }
    }

    const response = { 
      imageUrl, 
      presignedUrl,
      imageData,
      description,
      score: searchResult[0].score || 0
    };
    console.log('🔍 Returning response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error in muscle info API:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json({ 
      imageUrl: '', 
      description: `Error retrieving information for ${muscleName}. Please try again.` 
    }, { status: 500 });
  }
} 