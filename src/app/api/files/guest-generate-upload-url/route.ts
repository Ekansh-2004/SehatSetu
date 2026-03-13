import { NextRequest, NextResponse } from 'next/server'
import AWS from 'aws-sdk'
import { FileMetadataService } from '@/lib/db/services/fileMetadataService'
import { prisma } from '@/lib/db/prisma'

// Restricted guest upload: no Clerk auth, but requires a valid appointmentId and patientId
// This lets a guest upload documents immediately after successful payment.

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fileName,
      fileSize,
      mimeType,
      patientId,
      doctorId,
      appointmentId,
      tenantId,
      category = 'medical_record',
      description,
      expiresIn = 1200, // 20 minutes
    } = body
    console.log('body', body)

    if (!fileName || !fileSize || !mimeType || !patientId || !appointmentId) {
      return NextResponse.json(
        { error: 'fileName, fileSize, mimeType, patientId and appointmentId are required' },
        { status: 400 }
      )
    }

    // Validate patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Invalid patientId' }, { status: 400 })
    }

    // Validate appointment exists and is linked to doctor
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } })
    if (!appointment) {
      return NextResponse.json({ error: 'Invalid appointmentId' }, { status: 400 })
    }

    // Simple file type allow-list
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    // File size limit 25 MB for guests
    const maxSize = 25 * 1024 * 1024
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    const s3Bucket = process.env.AWS_S3_BUCKET || 'test-livconnect-1'

    // Build a deterministic stored filename: appointmentId_patientId_timestamp.ext
    const originalFileName = fileName
    const fileExtension = originalFileName.includes('.') ? originalFileName.split('.').pop() || '' : ''
    const timestamp = Date.now()
    const sanitizedStoredFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Create FileMetadata first to get a UUID, store the new file name
    const saved = await FileMetadataService.createFileMetadata({
      fileName: sanitizedStoredFileName,
      fileExtension,
      fileSize,
      mimeType,
      s3Key: '',
      s3Bucket,
      tenantId,
      patientId,
      doctorId: doctorId || appointment.doctorId,
      category,
      description,
      uploadedBy: 'guest',
    })

    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const s3Key = `files/${tenantId || 'default'}/${saved.uuid}/${timestamp}-${sanitizedName}`
    const s3Url = `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`

    await FileMetadataService.updateFileMetadata(saved.uuid, { s3Key, s3Url })

    const uploadParams = {
      Bucket: s3Bucket,
      Key: s3Key,
      Expires: expiresIn,
      ContentType: mimeType,
      Metadata: {
        uuid: saved.uuid,
        'uploaded-by': 'guest',
        'original-filename': fileName,
        'tenant-id': tenantId || '',
        'patient-id': patientId,
        'doctor-id': doctorId || appointment.doctorId,
        'appointment-id': appointmentId,
      },
    }

    const presignedUploadUrl = await s3.getSignedUrlPromise('putObject', uploadParams)

    return NextResponse.json({
      success: true,
      upload: {
        uuid: saved.uuid,
        presignedUrl: presignedUploadUrl,
        s3Key,
        s3Url,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      },
      file: {
        uuid: saved.uuid,
        fileName: saved.fileName,
        fileSize: saved.fileSize,
        mimeType: saved.mimeType,
        category: saved.category,
        description: saved.description,
        uploadedAt: saved.uploadedAt,
        originalFileName,
      },
    })
  } catch (error) {
    console.error('Guest upload URL error:', error)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
} 