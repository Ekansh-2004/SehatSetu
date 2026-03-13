import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import { FileMetadataService } from '@/lib/db/services/fileMetadataService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { id } = await params;
    console.log('id--------------------', id)
    // Get the appointment with consultation summary file UUID
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        consultationSummaryFileUuid: true,
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    console.log('appointment--------------------', appointment)
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check if appointment is completed
    if (appointment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Consultation summary is only available for completed appointments' },
        { status: 400 }
      );
    }

    // Check if consultation summary file exists
    if (!appointment.consultationSummaryFileUuid) {
      return NextResponse.json(
        { error: 'No consultation summary available for this appointment' },
        { status: 404 }
      );
    }
    console.log('appointment--------------------', appointment)

    // Get presigned download URL for the consultation summary
    const result = await FileMetadataService.getPresignedUrlByUuid(
      appointment.consultationSummaryFileUuid,
      3600 // 1 hour expiration
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Consultation summary file not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      patientName: appointment.patient?.name || 'Unknown Patient',
      patientEmail: appointment.patient?.email || null,
      doctorName: appointment.doctor?.name || 'Unknown Doctor',
      doctorEmail: appointment.doctor?.email || null,
      fileName: result.fileMetadata.fileName,
      fileSize: result.fileMetadata.fileSize,
      presignedUrl: result.presignedUrl,
      expiresAt: result.expiresAt,
    });

  } catch (error) {
    console.error('Error fetching consultation summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultation summary' },
      { status: 500 }
    );
  }
} 