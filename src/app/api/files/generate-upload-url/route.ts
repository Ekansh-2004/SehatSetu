import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { FileMetadataService } from '@/lib/db/services/fileMetadataService'
import { prisma } from '@/lib/db/prisma'
import AWS from 'aws-sdk'

const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
}

if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
  console.error('❌ AWS credentials not configured! Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.')
}

console.log('🔐 AWS S3 Configuration:', {
  region: s3Config.region,
  accessKeyId: s3Config.accessKeyId ? 'CONFIGURED' : 'NOT SET',
  secretKeyConfigured: !!s3Config.secretAccessKey,
});

const s3 = new AWS.S3(s3Config);

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';
  
  try {
    console.log('📤 [UPLOAD] Starting file upload request');
    
    // HIPAA Compliance: Verify user authentication
    const user = await currentUser()
    if (!user) {
      console.log('❌ [UPLOAD] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }
    
    userId = user.id;
    console.log(`👤 [UPLOAD] Authenticated user: ${userId}`);

    const body = await request.json()
    const { 
      fileName, 
      fileSize, 
      mimeType, 
      patientId, 
      doctorId, 
      category = 'other', 
      description,
      tenantId,
      expiresIn = 3600 // 1 hour for upload
    } = body
    
    console.log('📋 [UPLOAD] Request payload:', {
      fileName,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
      mimeType,
      patientId: patientId || 'none',
      doctorId: doctorId || 'none',
      category,
      tenantId: tenantId || 'default',
      expiresIn: `${expiresIn}s`
    });

    // Validate required fields
    if (!fileName || !fileSize || !mimeType) {
      console.log('❌ [UPLOAD] Missing required fields:', { fileName: !!fileName, fileSize: !!fileSize, mimeType: !!mimeType });
      return NextResponse.json(
        { error: 'fileName, fileSize, and mimeType are required' },
        { status: 400 }
      )
    }
    
    console.log('✅ [UPLOAD] Required fields validation passed');

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'audio/webm',
      'audio/mp3',
      'audio/wav',
      'audio/mpeg',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!allowedTypes.includes(mimeType)) {
      console.log(`❌ [UPLOAD] Invalid file type: ${mimeType}. Allowed: ${allowedTypes.join(', ')}`);
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }
    
    console.log(`✅ [UPLOAD] File type validation passed: ${mimeType}`);

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (fileSize > maxSize) {
      console.log(`❌ [UPLOAD] File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB > ${maxSize / (1024 * 1024)}MB`);
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }
    
    console.log(`✅ [UPLOAD] File size validation passed: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    

    // Validate patientId exists if provided
    if (patientId) {
      console.log(`🔍 [UPLOAD] Validating patient ID: ${patientId}`);
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      })
      if (!patient) {
        console.log(`❌ [UPLOAD] Patient not found: ${patientId}`);
        return NextResponse.json(
          { error: `Patient with ID ${patientId} not found` },
          { status: 400 }
        )
      }
      console.log(`✅ [UPLOAD] Patient validation passed: ${patient.name} (${patient.email})`);
    }

    // Validate doctorId exists if provided
    if (doctorId) {
      console.log(`🔍 [UPLOAD] Validating doctor ID: ${doctorId}`);
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId }
      })
      if (!doctor) {
        console.log(`❌ [UPLOAD] Doctor not found: ${doctorId}`);
        return NextResponse.json(
          { error: `Doctor with ID ${doctorId} not found` },
          { status: 400 }
        )
      }
      console.log(`✅ [UPLOAD] Doctor validation passed: ${doctor.name} (${doctor.email})`);
    }

    // First create the metadata record to get UUID
    const fileExtension = fileName.split('.').pop()

    const s3Bucket = process.env.AWS_S3_BUCKET || 'test-livconnect-1'
    
    console.log(`💾 [UPLOAD] Creating file metadata record...`);
    console.log(`🪣 [UPLOAD] Target S3 bucket: ${s3Bucket}`);
    
    // Create metadata record first (this generates the UUID)
    const fileMetadataData = {
      fileName: fileName,
      fileExtension: fileExtension || '',
      fileSize: fileSize,
      mimeType: mimeType,
      s3Key: '', // Will update after UUID generation
      s3Bucket: s3Bucket,
      tenantId: tenantId || undefined,
      patientId: patientId || undefined,
      doctorId: doctorId || undefined,
      category: category,
      description: description || undefined,
      uploadedBy: user.id
    }

    console.log('📝 [UPLOAD] File metadata to save:', {
      ...fileMetadataData,
      s3Key: 'TBD - will update after UUID generation'
    });

    const savedFileMetadata = await FileMetadataService.createFileMetadata(fileMetadataData)
    console.log(`✅ [UPLOAD] File metadata created with UUID: ${savedFileMetadata.uuid}`);

    // Now generate S3 key using UUID
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const s3Key = `files/${tenantId || 'default'}/${savedFileMetadata.uuid}/${timestamp}-${sanitizedFileName}`
    const s3Url = `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`
    
    console.log(`🔑 [UPLOAD] Generated S3 key: ${s3Key}`);
    console.log(`🌐 [UPLOAD] Generated S3 URL: ${s3Url}`);

    // Update the metadata record with S3 details
    console.log(`🔄 [UPLOAD] Updating metadata with S3 details...`);
    await FileMetadataService.updateFileMetadata(savedFileMetadata.uuid, {
      s3Key: s3Key,
      s3Url: s3Url
    })
    console.log(`✅ [UPLOAD] Metadata updated with S3 details`);

    // Generate presigned URL for PUT (upload)
    console.log(`🔗 [UPLOAD] Generating presigned upload URL...`);
    const uploadParams = {
      Bucket: s3Bucket,
      Key: s3Key,
      Expires: expiresIn,
      ContentType: mimeType,
      Metadata: {
        'uuid': savedFileMetadata.uuid,
        'uploaded-by': user.id,
        'original-filename': fileName,
        'tenant-id': tenantId || '',
        'patient-id': patientId || '',
        'doctor-id': doctorId || ''
      }
    }
    
    console.log(`🎯 [UPLOAD] S3 upload parameters:`, {
      bucket: uploadParams.Bucket,
      key: uploadParams.Key,
      expires: `${uploadParams.Expires}s`,
      contentType: uploadParams.ContentType,
      metadata: uploadParams.Metadata
    });

    const presignedUploadUrl = await s3.getSignedUrlPromise('putObject', uploadParams)
    console.log(`✅ [UPLOAD] Presigned upload URL generated successfully`);

    // HIPAA Compliance: Log presigned URL generation
    const processingTime = Date.now() - startTime;
    console.log(`📤 [UPLOAD] COMPLETED - User: ${user.id}, UUID: ${savedFileMetadata.uuid}, File: ${fileName}, Size: ${(fileSize / 1024 / 1024).toFixed(2)}MB, ProcessingTime: ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      message: 'Presigned upload URL generated successfully',
      upload: {
        uuid: savedFileMetadata.uuid,
        presignedUrl: presignedUploadUrl,
        s3Key: s3Key,
        s3Url: s3Url,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        uploadMethod: 'PUT'
      },
      file: {
        uuid: savedFileMetadata.uuid,
        fileName: savedFileMetadata.fileName,
        fileSize: savedFileMetadata.fileSize,
        mimeType: savedFileMetadata.mimeType,
        category: savedFileMetadata.category,
        description: savedFileMetadata.description,
        isUpdated: savedFileMetadata.isUpdated,
        uploadedAt: savedFileMetadata.uploadedAt
      },
      metadata: {
        tenantId: tenantId,
        patientId: patientId,
        doctorId: doctorId,
        uploadedBy: user.id
      },
      instructions: {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType
        },
        note: 'Upload the file directly to the presignedUrl using PUT method'
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ [UPLOAD] ERROR generating upload URL:', error);
    
    // HIPAA Compliance: Log errors with context
    console.error(`📤 [UPLOAD] FAILED - User: ${userId}, ProcessingTime: ${processingTime}ms, Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Log stack trace in development
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error(`📤 [UPLOAD] Stack trace:`, error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate upload URL',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// GET method to check upload status
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';
  
  try {
    console.log('🔍 [STATUS] Starting upload status check');
    
    const user = await currentUser()
    if (!user) {
      console.log('❌ [STATUS] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }
    
    userId = user.id;
    console.log(`👤 [STATUS] Authenticated user: ${userId}`);

    const { searchParams } = new URL(request.url)
    const uuid = searchParams.get('uuid')

    if (!uuid) {
      console.log('❌ [STATUS] Missing UUID parameter');
      return NextResponse.json(
        { error: 'UUID is required' },
        { status: 400 }
      )
    }
    
    console.log(`🔍 [STATUS] Checking status for UUID: ${uuid}`);

    // Get file metadata
    console.log(`💾 [STATUS] Fetching file metadata from database...`);
    const fileMetadata = await FileMetadataService.getFileMetadataByUuid(uuid)

    if (!fileMetadata) {
      console.log(`❌ [STATUS] File metadata not found for UUID: ${uuid}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    console.log(`✅ [STATUS] File metadata found: ${fileMetadata.fileName}`);

    // Check if file exists in S3
    const s3Params = {
      Bucket: fileMetadata.s3Bucket,
      Key: fileMetadata.s3Key
    }
    
    console.log(`☁️ [STATUS] Checking S3 object existence: ${s3Params.Bucket}/${s3Params.Key}`);

    try {
      await s3.headObject(s3Params).promise()
      const fileExists = true
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [STATUS] COMPLETED - File exists in S3, UUID: ${uuid}, ProcessingTime: ${processingTime}ms`);

      return NextResponse.json({
        success: true,
        uuid: uuid,
        fileName: fileMetadata.fileName,
        uploadStatus: fileExists ? 'completed' : 'pending',
        fileExists: fileExists,
        isUpdated: fileMetadata.isUpdated,
        uploadedAt: fileMetadata.uploadedAt,
        lastAccessedAt: fileMetadata.lastAccessedAt,
        accessCount: fileMetadata.accessCount
      })
    } catch (error) {
      console.error('❌ [STATUS] ERROR checking upload status:', error);
      const processingTime = Date.now() - startTime;
      console.log(`⏳ [STATUS] File not yet uploaded to S3, UUID: ${uuid}, ProcessingTime: ${processingTime}ms`);
      
      return NextResponse.json({
        success: true,
        uuid: uuid,
        fileName: fileMetadata.fileName,
        uploadStatus: 'pending',
        fileExists: false,
        isUpdated: fileMetadata.isUpdated,
        uploadedAt: fileMetadata.uploadedAt,
        message: 'File metadata exists but file not yet uploaded to S3'
      })
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ [STATUS] ERROR checking upload status:', error);
    console.error(`🔍 [STATUS] FAILED - User: ${userId}, ProcessingTime: ${processingTime}ms, Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Log stack trace in development
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error(`🔍 [STATUS] Stack trace:`, error.stack);
    }
    
    return NextResponse.json(
      { error: 'Failed to check upload status' },
      { status: 500 }
    )
  }
} 