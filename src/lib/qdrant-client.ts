import { QdrantClient } from '@qdrant/js-client-rest';

// Qdrant configuration
// const QUADRANT_URL = process.env.QUADRANT_URL;
// const QUADRANT_API_KEY = process.env.QUADRANT_API_KEY;

const QUADRANT_URL = 'https://603e99c8-77e8-4a7b-bcc6-efb562ec9e5f.us-east-1-0.aws.cloud.qdrant.io'
const QUADRANT_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.NWg1aKb0dg1SLZhan-3grQcAm47llPTSufntkdE8A_k"


// // Validate Qdrant URL
// if (!QUADRANT_URL) {
//   console.error('❌ QUADRANT_URL environment variable is not set');
//   console.error('Please add QUADRANT_URL=https://your-qdrant-cluster.qdrant.io to your .env file');
// }

// if (!QUADRANT_URL?.startsWith('http://') && !QUADRANT_URL?.startsWith('https://')) {
//   console.error('❌ QUADRANT_URL must start with http:// or https://');
//   console.error('Current value:', QUADRANT_URL);
//   console.error('Please use format: https://your-qdrant-cluster.qdrant.io');
// }

// Initialize Qdrant client only if URL is valid
export const qdrantClient = 
   new QdrantClient({
      url: QUADRANT_URL,
      apiKey: QUADRANT_API_KEY,
      timeout: 10000.0,  // Increased from 1000ms to 10000ms (10 seconds)
      checkCompatibility: false  // Skip version compatibility checks
    })


// Global types are now available without imports 