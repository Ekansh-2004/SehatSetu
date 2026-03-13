import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import AWS from 'aws-sdk';

// AWS S3 Configuration
const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
};

const s3 = new AWS.S3(s3Config);

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

    // Get documents for this patient - HIPAA compliant access
    const documents = await prisma.fileMetadata.findMany({
      where: {
        patientId: patient.id,
        isActive: true,
      },
      orderBy: { uploadedAt: 'desc' },
      select: {
        uuid: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        category: true,
        description: true,
        uploadedAt: true,
        s3Key: true,
        s3Bucket: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Error fetching patient documents:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Upload document for patient - HIPAA compliant
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { fileName, fileSize, mimeType, category = 'medical_record', description } = body;

    // Validate required fields
    if (!fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { success: false, error: 'fileName, fileSize, and mimeType are required' },
        { status: 400 }
      );
    }

    // Validate file type - HIPAA compliant file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/dicom',
      'application/octet-stream', 
    ];

    const fileExt = fileName.split('.').pop()?.toLowerCase();
    const isDicomFile = fileExt === 'dcm' || fileExt === 'dicom';

    if (!allowedTypes.includes(mimeType) && !isDicomFile) {
      return NextResponse.json(
        { success: false, error: `File type not allowed. Allowed types: PDF, JPEG, PNG, WEBP, TXT, DOC, DOCX, DICOM` },
        { status: 400 }
      );
    }

    const maxSize = isDicomFile ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size: 50MB` },
        { status: 400 }
      );
    }

    const s3Bucket = process.env.AWS_S3_BUCKET || 'test-livconnect-1';
    const fileExtension = fileName.split('.').pop();
    
    // Create file metadata record
    const fileMetadata = await prisma.fileMetadata.create({
      data: {
        fileName,
        fileExtension: fileExtension || '',
        fileSize,
        mimeType,
        s3Key: '', // Will be updated after UUID generation
        s3Bucket,
        patientId: patient.id,
        category,
        description,
        uploadedBy: patient.id,
      },
    });

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `patient-documents/${patient.id}/${fileMetadata.uuid}/${timestamp}-${sanitizedFileName}`;
    const s3Url = `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`;

    // Update metadata with S3 details
    await prisma.fileMetadata.update({
      where: { id: fileMetadata.id },
      data: { s3Key, s3Url },
    });

    // Generate presigned URL for upload
    const presignedUploadUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: s3Bucket,
      Key: s3Key,
      Expires: 3600, // 1 hour
      ContentType: mimeType,
      Metadata: {
        'uuid': fileMetadata.uuid,
        'patient-id': patient.id,
        'original-filename': fileName,
        'hipaa-compliant': 'true',
      },
    });

    // HIPAA Compliance: Log document upload initiation
    console.log(`[HIPAA] Document upload initiated - Patient: ${patient.id}, UUID: ${fileMetadata.uuid}, File: ${fileName}`);

    return NextResponse.json({
      success: true,
      data: {
        uuid: fileMetadata.uuid,
        presignedUrl: presignedUploadUrl,
        s3Key,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
      message: 'Upload URL generated successfully',
    });
  } catch (error) {
    console.error('Error creating document upload:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

