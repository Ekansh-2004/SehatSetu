import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { MultiTenantS3Client } from '@/lib/tenancy/multi-tenant-s3'
import { TenantConfigService } from '@/lib/tenancy/tenant-config'

export async function POST(request: NextRequest) {
  // HIPAA Compliance: Verify user authentication
  const user = await currentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized access' },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tenantId = formData.get('tenantId') as string
    const patientId = formData.get('patientId') as string
    const category = (formData.get('category') as string) || 'other'
    const description = formData.get('description') as string

    // Validate required fields
    if (!file || !tenantId || !patientId) {
      return NextResponse.json(
        { error: 'File, Tenant ID, and Patient ID are required' },
        { status: 400 }
      )
    }

    // Validate tenant exists
    const tenantConfig = TenantConfigService.getTenantConfig(tenantId)
    if (!tenantConfig) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      )
    }

    // Validate file upload against tenant limits
    const limits = TenantConfigService.getTenantLimits(tenantId)
    if (!limits) {
      return NextResponse.json({ error: 'Tenant limits not configured' }, { status: 400 })
    }
    if (file.size > limits.maxFileSize) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${Math.round(limits.maxFileSize / (1024 * 1024))}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'audio/webm',
      'audio/mp3',
      'audio/wav',
      'text/plain'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      )
    }

    // Generate unique S3 key for tenant
    const timestamp = Date.now()
    const fileExtension = file.name.includes('.') ? file.name.split('.').pop() : undefined
    const s3Key = `patient-files/${tenantId}/${patientId}/${timestamp}-${file.name}`

    // Upload to tenant-specific S3 bucket
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadParams = {
      key: s3Key,
      body: buffer,
      contentType: file.type,
      metadata: {
        'tenant-id': tenantId,
        'patient-id': patientId,
        'uploaded-by': user.id,
        'original-filename': file.name
      }
    }

    const uploadResult = await MultiTenantS3Client.uploadFile(
      tenantId,
      uploadParams.key,
      uploadParams.body,
      uploadParams.contentType,
      uploadParams.metadata
    )

    // Create file record using Prisma
    const saved = await prisma.fileMetadata.create({
      data: {
        fileName: file.name,
        fileExtension: fileExtension,
        fileSize: file.size,
        mimeType: file.type,
        s3Key: uploadResult.Key,
        s3Bucket: uploadResult.Bucket,
        s3Url: uploadResult.Location,
        tenantId,
        patientId,
        category,
        description: description || null,
        uploadedBy: user.id
      },
      select: {
        id: true,
        fileName: true,
        fileExtension: true,
        fileSize: true,
        category: true,
        uploadedAt: true
      }
    })

    // HIPAA Compliance: Log file upload
    console.log(`📁 File uploaded - User: ${user.id}, Tenant: ${tenantId}, Patient: ${patientId}, File: ${file.name}, Size: ${file.size} bytes`)

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: saved.id,
        fileName: saved.fileName,
        fileType: saved.fileExtension || (file.type ? file.type.split('/')[1] : 'unknown'),
        fileSize: saved.fileSize || 0,
        category: saved.category,
        uploadedAt: saved.uploadedAt
      },
      tenant: {
        id: tenantId,
        name: tenantConfig.name
      }
    })

  } catch (error) {
    console.error('❌ Error uploading file:', error)
    
    // HIPAA Compliance: Log errors
    const userId = user?.id || 'unknown'
    console.error(`📁 File upload error - User: ${userId}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 