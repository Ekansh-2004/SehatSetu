import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { DateTime } from 'luxon';
import { CLINIC_TIMEZONE } from '@/lib/config/timezone';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params;

    // Verify patient session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('patient_session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify the appointment belongs to the patient
    if (appointment.patientId !== sessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - appointment does not belong to you' },
        { status: 403 }
      );
    }

    // Check if appointment is already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Appointment is already cancelled' },
        { status: 400 }
      );
    }

    // Check if appointment is in the past (using clinic timezone - ET)
    const appointmentDateStr = appointment.date.toISOString().split('T')[0]; // "2026-01-22"
    
    // Get current date/time in clinic timezone (ET)
    const nowInET = DateTime.now().setZone(CLINIC_TIMEZONE);
    const todayStr = nowInET.toFormat('yyyy-MM-dd');
    
    // Check if appointment date is in the past
    if (appointmentDateStr < todayStr) {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel past appointments' },
        { status: 400 }
      );
    }
    
    // If appointment is today, check if the start time has passed
    if (appointmentDateStr === todayStr && appointment.startTime) {
      const [startHours, startMinutes] = appointment.startTime.split(':').map(Number);
      const appointmentStartMinutes = startHours * 60 + startMinutes;
      const currentMinutes = nowInET.hour * 60 + nowInET.minute;
      
      if (currentMinutes >= appointmentStartMinutes) {
        return NextResponse.json(
          { success: false, error: 'Cannot cancel an appointment that has already started' },
          { status: 400 }
        );
      }
    }

    // Update appointment status to cancelled
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    });

    console.log(`[APPOINTMENT_CANCEL] Appointment ${appointmentId} cancelled by patient ${sessionId}`);

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: {
        appointmentId: updatedAppointment.id,
        status: updatedAppointment.status,
      },
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}

