import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import { sendSlotOptionsMessage, SlotOption } from '@/lib/whatsapp-client';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { patientFormId, doctorId, slots } = body;

    // Validate input
    if (!patientFormId || !doctorId || !slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input. patientFormId, doctorId, and slots array required.' },
        { status: 400 }
      );
    }

    // Fetch patient form
    const patientForm = await prisma.patientFormSubmission.findUnique({
      where: { id: patientFormId },
    });

    if (!patientForm) {
      return NextResponse.json(
        { error: 'Patient form not found' },
        { status: 404 }
      );
    }

    if (!patientForm.phone || !patientForm.name) {
      return NextResponse.json(
        { error: 'Patient form is missing phone number or name' },
        { status: 400 }
      );
    }

    // Fetch doctor
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Calculate expiration (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Create slot offer record
    const slotOffer = await prisma.slotOffer.create({
      data: {
        patientFormId,
        doctorId,
        doctorName: doctor.name,
        slots: slots as any, // JSON field
        status: 'pending',
        expiresAt,
      },
    });

    // Send WhatsApp message
    const smsResult = await sendSlotOptionsMessage(
      patientForm.phone,
      patientForm.name,
      doctor.name,
      slots as SlotOption[],
      slotOffer.id
    );

    if (!smsResult.success) {
      // If WhatsApp message fails, delete the slot offer and return error
      await prisma.slotOffer.delete({
        where: { id: slotOffer.id },
      });

      return NextResponse.json(
        { error: smsResult.error || 'Failed to send WhatsApp message' },
        { status: 500 }
      );
    }

    // Update slot offer with WhatsApp message ID
    await prisma.slotOffer.update({
      where: { id: slotOffer.id },
      data: {
        messageId: smsResult.messageSid,
      },
    });

    // Update patient form status to 'slots_sent'
    await prisma.patientFormSubmission.update({
      where: { id: patientFormId },
      data: {
        status: 'slots_sent',
      },
    });

    return NextResponse.json({
      success: true,
      data: slotOffer,
      message: 'Slot options sent successfully',
    });
  } catch (error) {
    console.error('Error sending slot offers:', error);
    return NextResponse.json(
      { error: 'Failed to send slot offers' },
      { status: 500 }
    );
  }
}

