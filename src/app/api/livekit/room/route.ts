import { NextRequest, NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

function getRoomClient(): RoomServiceClient | null {
  const livekitHost = process.env.LIVEKIT_WS_URL || 'ws://localhost:7880';
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return null;
  }
  return new RoomServiceClient(livekitHost, apiKey, apiSecret);
}

export async function POST(request: NextRequest) {
  try {
   
    const { roomName, appointmentId, maxParticipants = 10 } = await request.json();
    console.log('Creating room ',roomName,appointmentId,maxParticipants);
    if (!roomName) {
      return NextResponse.json(
        { error: 'roomName is required' },
        { status: 400 }
      );
    }

    const roomClient = getRoomClient();
    if (!roomClient) {
      return NextResponse.json(
        { error: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set' },
        { status: 500 }
      );
    }

    // Create room with appointment metadata
    const room = await roomClient.createRoom({
      name: roomName,
      maxParticipants,
      metadata: JSON.stringify({
        appointmentId,
        createdAt: new Date().toISOString(),
        type: 'consultation',
      }),
    });

    return NextResponse.json({
      room
    });
  } catch (error) {
    console.error('Error creating LiveKit room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const roomClient = getRoomClient();
    if (!roomClient) {
      return NextResponse.json(
        { error: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get('roomName');
    console.log('Fetching room ',roomName,' ',searchParams);

    if (!roomName) {
      // List all rooms
      const rooms = await roomClient.listRooms();
      return NextResponse.json({ rooms });
    }

    // Get specific room
    const participants = await roomClient.listParticipants(roomName);
    const room = await roomClient.listRooms([roomName]);

    return NextResponse.json({
      room: room[0] || null,
      participants,
    });
  } catch (error) {
    console.error('Error fetching LiveKit room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const roomClient = getRoomClient();
    if (!roomClient) {
      return NextResponse.json(
        { error: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get('roomName');

    if (!roomName) {
      return NextResponse.json(
        { error: 'roomName is required' },
        { status: 400 }
      );
    }

    await roomClient.deleteRoom(roomName);

    return NextResponse.json({
      success: true,
      message: `Room ${roomName} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting LiveKit room:', error);
    return NextResponse.json(
      { error: 'Failed to delete room' },
      { status: 500 }
    );
  }
}