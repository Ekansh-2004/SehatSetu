import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import AWS from 'aws-sdk';

const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
};

if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
  console.error('❌ AWS credentials not configured! Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.')
}

const s3 = new AWS.S3(s3Config);

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

    // Generate presigned URL
    const presignedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: document.s3Bucket,
      Key: document.s3Key,
      Expires: 3600, // 1 hour
      ResponseContentDisposition: action === 'download' 
        ? `attachment; filename="${document.fileName}"`
        : `inline; filename="${document.fileName}"`,
      ResponseContentType: document.mimeType,
    });

    // HIPAA Compliance: Log document access
    console.log(`[HIPAA] Document accessed - Patient: ${patient.id}, UUID: ${uuid}, Action: ${action}, File: ${document.fileName}`);

    return NextResponse.json({
      success: true,
      data: {
        url: presignedUrl,
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

