import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to simulate WhatsApp webhook for local testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    // Simulate WhatsApp webhook format (Meta Cloud API structure)
    const whatsappPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15551234567',
                  phone_number_id: 'PHONE_NUMBER_ID',
                },
                contacts: [
                  {
                    profile: {
                      name: 'Test User',
                    },
                    wa_id: (phone || '+13604043153').replace(/[^\d]/g, ''),
                  },
                ],
                messages: [
                  {
                    from: (phone || '+13604043153').replace(/[^\d]/g, ''),
                    id: 'wamid.TEST' + Date.now(),
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'text',
                    text: {
                      body: message || '1',
                    },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    // Get the base URL from the request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Call the actual WhatsApp webhook
    const webhookResponse = await fetch(`${baseUrl}/api/whatsapp-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload),
    });

    const responseJson = await webhookResponse.json();

    return NextResponse.json({
      success: true,
      webhookResponse: responseJson,
      status: webhookResponse.status,
    });

  } catch (error: any) {
    console.error('Error testing webhook:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test webhook',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
