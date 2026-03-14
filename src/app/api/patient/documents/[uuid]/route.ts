import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
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

    // Get document metadata
    const document = await prisma.fileMetadata.findFirst({
      where: {
        uuid: uuid,
        patientId: patient.id,
        isActive: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if S3 key exists
    if (!document.s3Key || !document.s3Bucket) {
      return NextResponse.json(
        { success: false, error: 'Document storage information missing' },
        { status: 404 }
      );
    }

    // Get query parameter for action (view or download)
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'download';

    // Use direct URL for local storage / Vercel Blob.
    // Legacy AWS S3 records may be private and inaccessible without AWS credentials.
    let fileUrl = document.s3Url || '';
    if (!fileUrl && document.s3Bucket && document.s3Key) {
      fileUrl = `https://${document.s3Bucket}.s3.amazonaws.com/${document.s3Key}`;
    }

    const isLocalOrBlobStorage =
      document.s3Bucket === 'local-public' ||
      document.s3Bucket === 'vercel-blob' ||
      fileUrl.startsWith('/') ||
      fileUrl.includes('blob.vercel-storage.com');

    if (!isLocalOrBlobStorage) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This file was uploaded using legacy AWS storage and is no longer accessible after storage migration. Please re-upload this document.',
        },
        { status: 410 }
      );
    }

    if (fileUrl.startsWith('/')) {
      const origin = new URL(request.url).origin;
      fileUrl = `${origin}${fileUrl}`;
    }

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: 'Document URL is not available' },
        { status: 404 }
      );
    }

    // HIPAA Compliance: Log document access
    console.log(`[HIPAA] Document accessed - Patient: ${patient.id}, UUID: ${uuid}, Action: ${action}, File: ${document.fileName}`);

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        fileName: document.fileName,
        mimeType: document.mimeType,
      },
    });
  } catch (error) {
    console.error('Error generating document access URL:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

