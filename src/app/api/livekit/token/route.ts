import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

function getLiveKitWsUrl(): string | null {
  return process.env.LIVEKIT_WS_URL || process.env.LIVEKIT_URL || null;
}

export async function POST(request: NextRequest) {
  try {
    const { roomName, participantName, participantRole } = await request.json();

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'roomName and participantName are required' },
        { status: 400 }
      );
    }
    console.log('Generating token for room ',roomName,' ',participantName,' ',participantRole);

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = getLiveKitWsUrl();

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: 'LIVEKIT_URL/LIVEKIT_WS_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set' },
        { status: 500 }
      );
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: '10m', // 10 minutes
    });

    // Grant access to the room
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // If participant is a doctor, grant additional permissions
    if (participantRole === 'doctor') {
      at.addGrant({
        roomAdmin: true,
        canUpdateOwnMetadata: true,
      });
    }

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      wsUrl,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}