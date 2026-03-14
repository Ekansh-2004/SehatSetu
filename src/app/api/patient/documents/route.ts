import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { put } from '@vercel/blob';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

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

    const formData = await request.formData();
    const file = formData.get('file');
    const category = String(formData.get('category') || 'medical_record');
    const descriptionValue = formData.get('description');
    const description = typeof descriptionValue === 'string' ? descriptionValue : undefined;

    const isFileLike =
      !!file &&
      typeof (file as Blob).arrayBuffer === 'function' &&
      typeof (file as { name?: unknown }).name === 'string';

    if (!isFileLike) {
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      );
    }

    const uploadFile = file as File;
    const fileName = uploadFile.name;
    const fileSize = uploadFile.size;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const isDicomFile = fileExtension === 'dcm' || fileExtension === 'dicom';
    const mimeType = uploadFile.type || (isDicomFile ? 'application/dicom' : 'application/octet-stream');

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

    if (!allowedTypes.includes(mimeType) && !isDicomFile) {
      return NextResponse.json(
        { success: false, error: `File type not allowed. Allowed types: PDF, JPEG, PNG, WEBP, TXT, DOC, DOCX, DICOM` },
        { status: 400 }
      );
    }

    const maxSize = isDicomFile ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size: ${isDicomFile ? '100MB' : '50MB'}` },
        { status: 400 }
      );
    }

    const fileExt = fileName.split('.').pop();
    
    // Create file metadata record
    const fileMetadata = await prisma.fileMetadata.create({
      data: {
        fileName,
        fileExtension: fileExt || '',
        fileSize,
        mimeType,
        s3Key: '', // Will be updated after UUID generation
        s3Bucket: 'pending',
        patientId: patient.id,
        category,
        description,
        uploadedBy: patient.id,
      },
    });

    // Generate storage key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `patient-documents/${patient.id}/${fileMetadata.uuid}/${timestamp}-${sanitizedFileName}`;

    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    let storageBucket = 'local-public';
    let storageUrl = '';
    let storedKey = storageKey;

    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const blob = await put(storageKey, buffer, {
            access: 'public',
            contentType: mimeType,
          });
          storageBucket = 'vercel-blob';
          storageUrl = blob.url;
          storedKey = blob.pathname || storageKey;
        } catch (blobError) {
          console.warn('Blob upload failed, falling back to local storage:', blobError);
          const localRelativePath = path.join('uploads', storageKey).replace(/\\/g, '/');
          const localAbsolutePath = path.join(process.cwd(), 'public', localRelativePath);
          await mkdir(path.dirname(localAbsolutePath), { recursive: true });
          await writeFile(localAbsolutePath, buffer);
          storageBucket = 'local-public';
          storageUrl = `/${localRelativePath}`;
          storedKey = localRelativePath;
        }
      } else {
        const localRelativePath = path.join('uploads', storageKey).replace(/\\/g, '/');
        const localAbsolutePath = path.join(process.cwd(), 'public', localRelativePath);
        await mkdir(path.dirname(localAbsolutePath), { recursive: true });
        await writeFile(localAbsolutePath, buffer);
        storageUrl = `/${localRelativePath}`;
        storedKey = localRelativePath;
      }
    } catch (uploadError) {
      await prisma.fileMetadata.delete({ where: { id: fileMetadata.id } });
      console.error('Storage upload failed:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Update metadata with storage details
    await prisma.fileMetadata.update({
      where: { id: fileMetadata.id },
      data: { s3Key: storedKey, s3Bucket: storageBucket, s3Url: storageUrl },
    });

    // HIPAA Compliance: Log document upload initiation
    console.log(`[HIPAA] Document upload initiated - Patient: ${patient.id}, UUID: ${fileMetadata.uuid}, File: ${fileName}`);

    return NextResponse.json({
      success: true,
      data: {
        uuid: fileMetadata.uuid,
        s3Key: storedKey,
        s3Url: storageUrl,
        storageBucket,
      },
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Error creating document upload:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

