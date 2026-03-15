import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const patientSessionId = cookieStore.get('patient_session')?.value;

    if (!patientSessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get patient
    const patient = await prisma.patient.findUnique({
      where: { id: patientSessionId },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get appointments for this patient (both by patientId and by email for guest bookings)
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { patientId: patient.id },
          { guestEmail: patient.email },
        ],
      },
      orderBy: { date: 'desc' },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            email: true,
            phone: true,
            image: true,
          },
        },
      },
    });

    // Get consultations for this patient
    const consultations = await (prisma as any).consultation.findMany({
      where: { patientId: patient.id },
      orderBy: { preferredDate: 'desc' },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            email: true,
            phone: true,
            image: true,
          },
        },
      },
    });

    // Map consultations to appointment format
    const mappedConsultations = consultations.map((c: any) => ({
      id: c.id,
      date: c.finalDate || c.preferredDate,
      startTime: c.finalTime || c.preferredTime,
      endTime: c.finalTime ? "TBD" : "TBD", // End time is usually not stored for consultations
      status: c.status.toLowerCase(),
      mode: c.consultationType.toLowerCase(),
      reason: c.symptoms,
      doctor: c.doctor,
    }));

    // Combine and sort
    const allAppointments = [...appointments, ...mappedConsultations].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({
      success: true,
      data: allAppointments,
    });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

