import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  await request.json().catch(() => null);
  return NextResponse.json(
    {
      success: false,
      error: 'Summary backend is disabled. Report generation now uses transcript text directly.',
    },
    { status: 410 }
  );
} 