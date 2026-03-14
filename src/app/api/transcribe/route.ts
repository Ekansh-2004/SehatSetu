import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  await request.formData();
  return NextResponse.json(
    {
      success: false,
      error: 'Server transcription endpoint is deprecated. Live transcription now uses browser speech recognition.',
    },
    { status: 410 }
  );
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