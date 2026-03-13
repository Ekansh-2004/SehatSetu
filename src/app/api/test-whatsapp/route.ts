import { NextRequest, NextResponse } from 'next/server';
import { sendGenericWhatsAppMessage, isWhatsAppConfigured } from '@/lib/whatsapp-client';

// Test endpoint to send WhatsApp message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!isWhatsAppConfigured()) {
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured in environment variables' },
        { status: 500 }
      );
    }

    if (!to) {
      return NextResponse.json(
        { error: 'Phone number (to) is required' },
        { status: 400 }
      );
    }

    // Send WhatsApp message
    const result = await sendGenericWhatsAppMessage(
      to,
      message || 'Test message from ClinixAI! 🏥'
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to send WhatsApp message',
          details: result.error 
        },
        { status: 500 }
      );
    }

    console.log('WhatsApp message sent successfully:', result.messageId);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      to: to,
    });

  } catch (error: any) {
    console.error('Error sending test WhatsApp message:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send WhatsApp message',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check WhatsApp configuration status
export async function GET() {
  return NextResponse.json({
    configured: isWhatsAppConfigured(),
    message: isWhatsAppConfigured() 
      ? 'WhatsApp is configured and ready' 
      : 'WhatsApp credentials are not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables.',
  });
}

