import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { CLINIC_TIMEZONE } from '@/lib/config/timezone';
import { sendAppointmentConfirmationEmail } from '@/lib/email';
import { sendBookingConfirmation } from '@/lib/whatsapp-client';

// Validation schema for instant booking
const instantBookingSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  patientId: z.string().min(1, 'Patient ID is required'),
  mode: z.enum(['physical', 'video']).default('physical'),
});

export async function POST(request: NextRequest) {
  try {
    // Check if instant booking is enabled
    const instantBookingEnabled = process.env.NEXT_PUBLIC_INSTANT_BOOKING === 'true';
    if (!instantBookingEnabled) {
      return NextResponse.json(
        { success: false, error: 'Instant booking is not enabled' },
        { status: 403 }
      );
    }

    // Verify patient session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('patient_session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = instantBookingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { doctorId, date, startTime, patientId, mode } = validationResult.data;

    // Parse date in clinic timezone to avoid timezone issues
    // This ensures "2026-01-22" is treated as Jan 22 in the clinic's timezone
    const appointmentDate = DateTime.fromISO(date, { zone: CLINIC_TIMEZONE }).toJSDate();

    // Verify patient matches session
    if (sessionId !== patientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get patient details
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get doctor details
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Calculate end time (default 30 minutes, or use doctor's session duration)
    const sessionDuration = doctor.defaultSessionDuration || 30;
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = minutes + sessionDuration;
    const endHours = hours + Math.floor(endMinutes / 60);
    const finalMinutes = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;

    // Check for conflicting appointments (completed appointments should also block the slot)
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        date: appointmentDate,
        status: { in: ['scheduled', 'confirmed', 'completed'] },
        OR: [
          {
            // New appointment starts during existing appointment
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            // New appointment ends during existing appointment
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            // New appointment encompasses existing appointment
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { success: false, error: 'This time slot is no longer available' },
        { status: 409 }
      );
    }

    // Create the appointment with confirmed status (instant booking)
    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId,
        date: appointmentDate,
        startTime,
        endTime,
        reason: 'Appointment booked via instant booking',
        type: 'consultation',
        mode: mode,
        symptoms: '',
        paymentAmount: doctor.consultationFee || 0,
        paymentStatus: 'not_required',
        status: 'confirmed', // Directly confirmed for instant booking
      },
    });

    const formattedDate = DateTime.fromISO(date, { zone: CLINIC_TIMEZONE }).toFormat('MMMM dd, yyyy'); 
    const [timeHours, timeMins] = startTime.split(':').map(Number);
    const formattedTime = DateTime.fromObject({ hour: timeHours, minute: timeMins }, { zone: CLINIC_TIMEZONE })
      .toFormat('h:mm a');

    // Send confirmation email with meeting room link (for video consultations)
    if (mode === 'video' && patient.email) {
      try {
        const meetingRoomUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consultation/${appointment.id}?patientName=${encodeURIComponent(patient.name)}&doctorName=${encodeURIComponent(doctor.name)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(startTime)}&appointmentId=${appointment.id}`;

        await sendAppointmentConfirmationEmail({
          patientName: patient.name,
          patientEmail: patient.email,
          doctorName: doctor.name,
          appointmentDate: date,
          appointmentTime: startTime,
          meetingRoomUrl,
          appointmentId: appointment.id,
        });
        console.log(`[INSTANT_BOOKING] Confirmation email sent to: ${patient.email}`);
      } catch (emailError) {
        // Don't fail the booking if email fails
        console.error('[INSTANT_BOOKING] Failed to send confirmation email:', emailError);
      }
    }

    if (patient.phone && !patient.phone.startsWith('+0')) {
      try {
        const whatsappResult = await sendBookingConfirmation(
          patient.phone,
          patient.name || 'Patient',
          doctor.name,
          formattedDate,
          formattedTime
        );
      } catch (whatsappError) {
        console.error('[INSTANT_BOOKING] Error sending WhatsApp confirmation:', whatsappError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        appointmentId: appointment.id,
        doctorName: doctor.name,
        date: date,
        startTime,
        endTime,
        status: 'confirmed',
        mode,
      },
    });
  } catch (error) {
    console.error('Error creating instant booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}

