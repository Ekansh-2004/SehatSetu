import { NextRequest, NextResponse } from 'next/server';

const WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:8000/v1/audio/transcriptions';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const appointmentId = formData.get('appointmentId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log(`🎙️ Sending chunk (${file.size} bytes) to Whisper at ${WHISPER_API_URL}`);

    // Create a new FormData object to send to Whisper
    const whisperFormData = new FormData();
    whisperFormData.append('file', file, 'audio.webm');
    whisperFormData.append('model', 'whisper-1'); // Common explicit model name for compatible APIs
    whisperFormData.append('response_format', 'json');

    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      body: whisperFormData,
    });

    if (!response.ok) {
       const errorText = await response.text();
       throw new Error(`Whisper API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // We expect the payload to look like { text: "Hello..." }
    const transcript = data.text || data.transcript || '';

    console.log(`📝 Whisper returned: "${transcript.substring(0, 50)}..."`);

    return NextResponse.json({ 
      success: true, 
      transcript,
      appointmentId
    });

  } catch (error) {
    console.error('❌ Failed to process audio with Whisper:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}