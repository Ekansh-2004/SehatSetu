import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendSlotConfirmationMessage, SlotOption } from '@/lib/whatsapp-client';

// Disable body parser for WhatsApp webhook
export const dynamic = 'force-dynamic';

// Helper function to parse slot selection from message
function parseSlotFromMessage(messageBody: string, slots: any[]): any | null {
  const cleanedMessage = messageBody.trim().toLowerCase();
  
  // Try to match number-based selections like "1", "2", "slot 1", etc.
  const numberMatch = cleanedMessage.match(/(\d+)/);
  if (numberMatch) {
    const slotIndex = parseInt(numberMatch[1], 10) - 1; // Convert to 0-based index
    if (slotIndex >= 0 && slotIndex < slots.length) {
      return slots[slotIndex];
    }
  }
  
  // Try to match by date or time patterns in the slots
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    // Check if message contains the date or time from this slot
    if (cleanedMessage.includes(slot.date) || cleanedMessage.includes(slot.startTime)) {
      return slot;
    }
  }
  
  return null;
}

/**
 * GET handler for WhatsApp webhook verification
 * Meta sends a GET request to verify the webhook URL
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  console.log('WhatsApp webhook verification:', { mode, token, challenge });

  // Check if mode and token are correct
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WhatsApp webhook verified successfully');
    // Return the challenge to verify
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('❌ WhatsApp webhook verification failed');
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST handler for incoming WhatsApp messages
 */
export async function POST(request: NextRequest) {
  console.log('🔔 WhatsApp webhook POST received!');
  
  try {
    const body = await request.json();

    console.log('📩 WhatsApp webhook payload:', JSON.stringify(body, null, 2));

    // WhatsApp webhook structure:
    // body.entry[0].changes[0].value.messages[0] contains the message
    // body.entry[0].changes[0].value.contacts[0] contains sender info

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    // Check if this is a status update (delivery receipts, etc.)
    if (value?.statuses) {
      console.log('Ignoring WhatsApp status update');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Check if there's an actual message
    const messages = value?.messages;
    if (!messages || messages.length === 0) {
      console.log('No messages in webhook payload');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    const message = messages[0];
    const messageType = message.type;

    // Only process text messages
    if (messageType !== 'text') {
      console.log('Ignoring non-text message:', messageType);
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    const from = message.from; // Phone number without + prefix
    const messageBody = message.text?.body;
    const messageId = message.id;

    console.log('Processing WhatsApp message:', {
      from,
      messageBody,
      messageId,
    });

    if (!from || !messageBody) {
      console.log('Missing from or messageBody');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Format phone for database lookup (add + prefix)
    const formattedPhone = `+${from}`;
    
    // Also try matching without country code prefix
    const phoneVariants = [
      formattedPhone,
      from,
      `+1${from}`, // US format
      from.slice(-10), // Last 10 digits
    ];

    // 1️⃣ Find the patient form by phone number
    let patientForm = null;
    
    for (const phoneVariant of phoneVariants) {
      patientForm = await prisma.patientFormSubmission.findFirst({
        where: { 
          phone: {
            contains: phoneVariant.slice(-10), // Match last 10 digits
          }
        },
        orderBy: { createdAt: 'desc' },
      });
      
      if (patientForm) break;
    }

    if (!patientForm) {
      console.log('No patient form found for phone:', from, '- Silently ignoring');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // 2️⃣ Check if there's any active slot offer for this patient form
    const offer = await prisma.slotOffer.findFirst({
      where: {
        patientFormId: patientForm.id,
        status: 'pending',
      },
      include: { 
        doctor: true,
        patientForm: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!offer) {
      console.log('No pending slot offer found for patient form:', patientForm.id);
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Check if offer is expired
    if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
      console.log('Slot offer expired for patient form:', patientForm.id);
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // 3️⃣ Parse patient's reply (e.g. "1", "2", "Slot 1")
    const selectedSlot = parseSlotFromMessage(messageBody, offer.slots as any[]);

    if (!selectedSlot) {
      console.log('Could not parse slot selection from message:', messageBody);
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    console.log('Patient selected slot:', selectedSlot);

    // 4️⃣ Update DB: confirm slot, mark status
    await prisma.slotOffer.update({
      where: { id: offer.id },
      data: {
        status: 'confirmed',
        patientConfirmedSlot: selectedSlot,
        confirmedAt: new Date(),
      },
    });

    // Update patient form status to slots_confirmed
    await prisma.patientFormSubmission.update({
      where: { id: patientForm.id },
      data: {
        status: 'slots_confirmed',
      },
    });

    // 5️⃣ Send confirmation message to patient
    const confirmedSlotTyped = selectedSlot as SlotOption;
    
    if (patientForm.phone && patientForm.name) {
      await sendSlotConfirmationMessage(
        patientForm.phone,
        patientForm.name,
        offer.doctor.name,
        confirmedSlotTyped
      );
    }

    console.log('Slot confirmed successfully for patient form:', patientForm.id);

    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
    // Return 200 to prevent Meta from retrying
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

