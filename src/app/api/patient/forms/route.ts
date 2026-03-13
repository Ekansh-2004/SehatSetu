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

    // Get form submissions for this patient
    const forms = await prisma.patientFormSubmission.findMany({
      where: {
        OR: [
          { patientId: patient.id },
          { email: patient.email },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        slotOffers: {
          select: {
            id: true,
            status: true,
            doctorName: true,
            slots: true,
            patientConfirmedSlot: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: forms,
    });
  } catch (error) {
    console.error('Error fetching patient forms:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

