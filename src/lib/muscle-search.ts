import { qdrantClient } from './qdrant-client';
// Global types are now available without imports
import { encodeText } from './sentence-encoder';

export async function searchMuscleInQdrant(query: string): Promise<QdrantSearchResponse> {
  try {
    // Check if Qdrant client is available
    if (!qdrantClient) {
      console.log('❌ Qdrant client not available - check QUADRANT_URL in .env file');
      return {
        success: false,
        results: [],
        error: 'Qdrant client not configured. Please check QUADRANT_URL in .env file.'
      };
    }

    console.log(`🔍 Searching Qdrant for: '${query}'...`);
    
    // Encode the query text
    const queryVector = await encodeText(query);
    
    // Perform similarity search in Qdrant
    const searchResult = await qdrantClient.search('muscles_cyro', {
      vector: queryVector,
      limit: 1,
      score_threshold: 0.7 // Adjust threshold as needed
    });
    
    if (!searchResult || searchResult.length === 0) {
      console.log('❌ No results found in Qdrant');
      return {
        success: false,
        results: [],
        error: 'No matching muscle found'
      };
    }
    console.log('🔍 Searching Qdrant for: @123');
    // Extract the best match
    const point = searchResult[0];
    const payload = point.payload as Record<string, unknown>;
    
    const result: MuscleSearchResult = {
      muscle_name: (payload.muscle_name as string) || query,
      description: (payload.description as string) || 'No description available',
      s3_url: (payload.s3_url as string) || '',
      score: point.score || 0
    };
    
    console.log('✅ Match found in Qdrant:');
    console.log(`   Muscle Name: ${result.muscle_name}`);
    console.log(`   Description: ${result.description}`);
    console.log(`   Image URL: ${result.s3_url}`);
    console.log(`   Score: ${result.score}`);
    
    return {
      success: true,
      results: [result]
    };
    
  } catch (error) {
    console.error('❌ Qdrant search error:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function searchMultipleMuscles(terms: string[]): Promise<QdrantSearchResponse> {
  // Check if Qdrant client is available
  if (!qdrantClient) {
    console.log('❌ Qdrant client not available - skipping muscle search');
    return {
      success: false,
      results: [],
      error: 'Qdrant client not configured. Please check QUADRANT_URL in .env file.'
    };
  }

  const allResults: MuscleSearchResult[] = [];
  
  for (const term of terms) {
    try {
      const result = await searchMuscleInQdrant(term);
      if (result.success && result.results.length > 0) {
        allResults.push(...result.results);
      }
    } catch (error) {
      console.error(`❌ Failed to search for term '${term}':`, error);
    }
  }
  
  return {
    success: allResults.length > 0,
    results: allResults
  };
} 