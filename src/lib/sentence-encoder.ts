const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

/**
 * Encodes text using Ollama's local embeddings API.
 * Returns a Promise<number[]> embedding.
 */
export async function encodeText(text: string): Promise<number[]> {
  console.log('🔍 Encoding text with Ollama:', text);
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_EMBEDDING_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
       throw new Error(`Ollama Embedding API error: ${response.statusText}`);
    }

    const data = await response.json();
    const embedding = data.embedding;
    
    if (!embedding) throw new Error('No embedding returned from Ollama');
    return embedding;
  } catch (error) {
    console.error('❌ Failed to encode text with Ollama:', error);
    throw error;
  }
} 