import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import { sendBookingConfirmation, SlotOption } from '@/lib/whatsapp-client';
import { sanitizeId } from '@/lib/security/input-sanitizer';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rateLimitResult = await withRateLimit(
      request,
      '/api/slot-offers/book',
      RATE_LIMIT_CONFIGS.api,
      { userId: user.id }
    );
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }

    const body = await request.json();
    const { slotOfferId } = body;

    if (!slotOfferId) {
      return NextResponse.json(
        { error: 'slotOfferId is required' },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const sanitizedId = sanitizeId(slotOfferId);
    if (!sanitizedId) {
      return NextResponse.json(
        { error: 'Invalid slotOfferId format' },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const slotOffer = await prisma.slotOffer.findUnique({
      where: { id: sanitizedId },
      include: {
        patientForm: true,
        doctor: true,
      },
    });

    if (!slotOffer) {
      return NextResponse.json(
        { error: 'Slot offer not found' },
        { status: 404 }
      );
    }

    if (slotOffer.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Slot offer is not confirmed. Current status: ' + slotOffer.status },
        { status: 400 }
      );
    }

    if (!slotOffer.patientConfirmedSlot) {
      return NextResponse.json(
        { error: 'No confirmed slot found' },
        { status: 400 }
      );
    }

    const confirmedSlot = slotOffer.patientConfirmedSlot as unknown as SlotOption;

    // Calculate end time (30 minutes after start time)
    const [hours, minutes] = confirmedSlot.startTime.split(':').map(Number);
    const endMinutes = minutes + 30;
    const endHours = hours + Math.floor(endMinutes / 60);
    const finalMinutes = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        doctorId: slotOffer.doctorId,
        date: new Date(confirmedSlot.date),
        startTime: confirmedSlot.startTime,
        endTime: endTime,
        reason: 'Appointment booked via patient form',
        type: 'consultation',
        mode: 'physical',
        guestName: slotOffer.patientForm.name,
        guestEmail: slotOffer.patientForm.email,
        guestPhone: slotOffer.patientForm.phone,
        symptoms: 'As per patient form submission',
        paymentAmount: 0,
        paymentStatus: 'not_required',
        status: 'scheduled',
      },
    });

    // Update slot offer status to 'booked'
    await prisma.slotOffer.update({
      where: { id: slotOfferId },
      data: {
        status: 'booked',
      },
    });

    // Update patient form status to 'appointment_booked'
    await prisma.patientFormSubmission.update({
      where: { id: slotOffer.patientFormId },
      data: {
        status: 'appointment_booked',
        appointmentId: appointment.id,
      },
    });

    // Send booking confirmation SMS
    const appointmentDate = new Date(confirmedSlot.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    
    // Convert 24h to 12h format
    const [h, m] = confirmedSlot.startTime.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const appointmentTime = `${displayHour}:${m} ${ampm}`;

    if (slotOffer.patientForm.phone) {
      await sendBookingConfirmation(
        slotOffer.patientForm.phone,
        slotOffer.patientForm.name,
        slotOffer.doctor.name,
        appointmentDate,
        appointmentTime
      );
    }

    return NextResponse.json({
      success: true,
      data: appointment,
      message: 'Appointment booked successfully',
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    return NextResponse.json(
      { error: 'Failed to book appointment' },
      { status: 500 }
    );
  }
}

