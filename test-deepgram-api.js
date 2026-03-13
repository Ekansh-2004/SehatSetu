/**
 * Test script to verify Deepgram Management API integration
 * Run with: node test-deepgram-api.js
 */

const { createClient } = require('@deepgram/sdk');
require('dotenv').config();

async function testDeepgramAPI() {
  console.log('🧪 Testing Deepgram Management API Integration...\n');

  // Check environment variables
  const apiKey = process.env.DEEPGRAM_API_KEY;
  const projectId = process.env.DEEPGRAM_PROJECT_ID;

  console.log('📋 Environment Check:');
  console.log(`✅ DEEPGRAM_API_KEY: ${apiKey ? 'Set' : '❌ Missing'}`);
  console.log(`✅ DEEPGRAM_PROJECT_ID: ${projectId ? 'Set' : '❌ Missing'}\n`);

  if (!apiKey || !projectId) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  try {
    const deepgram = createClient(apiKey);
    
    console.log('🔌 Testing Deepgram Management API connection...');
    
    // Test with a dummy request ID (this will likely fail, but we can see the error structure)
    const testRequestId = 'test-request-id-12345';
    
    try {
      const response = await deepgram.manage.getProjectUsageRequest(projectId, testRequestId);
      console.log('✅ API call successful!');
      console.log('📊 Response structure:', JSON.stringify(response, null, 2));
    } catch (apiError) {
      console.log('⚠️  API call failed (expected for test request ID)');
      console.log('📋 Error details:', apiError.message);
      console.log('🔍 This helps us understand the API response structure');
      
      // Check if it's a 404 (expected) vs other errors
      if (apiError.message.includes('404') || apiError.message.includes('not found')) {
        console.log('✅ API is accessible (404 is expected for test request ID)');
      } else {
        console.log('❌ Unexpected API error:', apiError.message);
      }
    }

  } catch (error) {
    console.error('❌ Failed to initialize Deepgram client:', error.message);
    process.exit(1);
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Start a consultation session');
  console.log('2. Record some audio');
  console.log('3. End the session');
  console.log('4. Check the admin analytics dashboard');
  console.log('5. Look for Deepgram usage data');
}

testDeepgramAPI().catch(console.error);
