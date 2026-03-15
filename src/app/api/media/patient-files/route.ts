import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { MultiTenantS3Client } from '@/lib/tenancy/multi-tenant-s3'
import { TenantConfigService } from '@/lib/tenancy/tenant-config'
import { FileMetadataService } from '../../../../lib/db/services/fileMetadataService'

interface PatientFileResponse {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  mimeType: string
  category: string
  description?: string
  uploadedAt: string
  presignedUrl: string
  expiresAt: string
}

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

    // Get tenant ID and patient ID from request body
    const { tenantId, patientId } = await request.json()
    
    if (!tenantId || !patientId) {
      return NextResponse.json(
        { error: 'Tenant ID and Patient ID are required' },
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

    // HIPAA Compliance: Log access for audit trail
    console.log(`🔐 File access request - User: ${user.id}, Tenant: ${tenantId}, Patient: ${patientId}, Time: ${new Date().toISOString()}`)

    // Get all active files for the patient within the tenant
    const patientFiles = await prisma.fileMetadata.findMany({
      where: {
        isActive: true,
        patientId,
      },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileExtension: true,
        fileSize: true,
        mimeType: true,
        category: true,
        description: true,
        uploadedAt: true,
        s3Url: true,
        s3Key: true,
        s3Bucket: true,
        tenantId: true
      }
    })

    if (!patientFiles || patientFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No files found for this patient',
        files: []
      })
    }

    // Generate presigned URLs for each file using tenant-specific S3 client
    const filesWithPresignedUrls: PatientFileResponse[] = []
    const currentTime = new Date()

    for (const file of patientFiles) {
      try {
        // Use stored URL directly (Vercel Blob URLs are public)
        const fileUrl = file.s3Url || undefined

        // Generate presigned URL (for Vercel Blob this just returns the URL)
        const presignedUrl = fileUrl 
          ? await MultiTenantS3Client.generatePresignedUrl(file.tenantId || tenantId, fileUrl, 3600)
          : undefined
        
        if (presignedUrl) {
          const expiresAt = new Date(currentTime.getTime() + 3600 * 1000)
          
          filesWithPresignedUrls.push({
            id: file.id,
            fileName: file.fileName,
            fileType: file.fileExtension || (file.mimeType ? file.mimeType.split('/')[1] : 'unknown'),
            fileSize: file.fileSize || 0,
            mimeType: file.mimeType || 'application/octet-stream',
            category: file.category,
            description: file.description || undefined,
            uploadedAt: file.uploadedAt.toISOString(),
            presignedUrl: presignedUrl,
            expiresAt: expiresAt.toISOString()
          })
        } else {
          console.error(`❌ Failed to generate presigned URL for file: ${file.fileName}`)
        }
      } catch (error) {
        console.error(`❌ Error generating presigned URL for file ${file.fileName}:`, error)
        // Continue with other files even if one fails
      }
    }

    // HIPAA Compliance: Log successful access
    console.log(`✅ File access completed - User: ${user.id}, Tenant: ${tenantId}, Patient: ${patientId}, Files: ${filesWithPresignedUrls.length}`)

    return NextResponse.json({
      success: true,
      message: `Found ${filesWithPresignedUrls.length} files for patient`,
      files: filesWithPresignedUrls,
      totalFiles: filesWithPresignedUrls.length,
      generatedAt: currentTime.toISOString(),
      tenant: {
        id: tenantId,
        name: tenantConfig.name
      }
    })

  } catch (error) {
    console.error('❌ Error in patient files API:', error)
    
    // HIPAA Compliance: Log errors for audit trail
    const userId = user?.id || 'unknown'
    console.error(`🔐 File access error - User: ${userId}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve patient files',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// GET method for retrieving file metadata without presigned URLs (for listing purposes)
export async function GET(request: NextRequest) {
  try {
    // HIPAA Compliance: Verify user authentication
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || undefined
    const patientId = searchParams.get('patientId')
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      )
    }

    // Validate tenant exists only if provided (backward compatibility for records without tenant)
    const tenantConfig = tenantId ? TenantConfigService.getTenantConfig(tenantId) : null
    if (tenantId && !tenantConfig) {
      // Log and continue without tenant filtering rather than erroring out
      console.warn(`Tenant not found for id: ${tenantId}. Proceeding without tenant filter.`)
    }

    // Get all active files for the patient within the tenant (metadata only)
    const where: {
      isActive: boolean;
      patientId: string;
      OR?: Array<{ tenantId: string | null }>;
    } = {
      isActive: true,
      patientId,
    }

    // If tenantId provided, include records that either match tenantId OR have null tenantId (legacy data)
    if (tenantId) {
      where.OR = [{ tenantId }, { tenantId: null }]
    }

    const patientFiles = await prisma.fileMetadata.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        uuid: true,
        fileName: true,
        fileExtension: true,
        fileSize: true,
        mimeType: true,
        category: true,
        description: true,
        uploadedAt: true,
        uploadedBy: true,
        s3Url: true,
        s3Key: true,
        s3Bucket: true,
        tenantId: true
      }
    })

    // Generate presigned URLs for inline viewing
    const currentTime = new Date()
    const filesWithUrls = [] as Array<{
      id: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      mimeType: string;
      category: string;
      description?: string;
      uploadedAt: string;
      uploadedBy?: string;
      presignedUrl?: string;
      expiresAt?: string;
    }>

    for (const file of patientFiles) {
      let presignedUrl: string | undefined
      try {
        const result = await FileMetadataService.getPresignedUrlByUuid(file.uuid, 3600)
        presignedUrl = result.presignedUrl
       
       
      } catch {
        // Non-fatal: continue without URL
      }

      const expiresAt = presignedUrl ? new Date(currentTime.getTime() + 3600 * 1000).toISOString() : undefined

      filesWithUrls.push({
        id: file.id,
        fileName: file.fileName,
        fileType: file.fileExtension || (file.mimeType ? file.mimeType.split('/') [1] : 'unknown'),
        fileSize: file.fileSize || 0,
        mimeType: file.mimeType || 'application/octet-stream',
        category: file.category,
        description: file.description || undefined,
        uploadedAt: file.uploadedAt.toISOString(),
        uploadedBy: file.uploadedBy || undefined,
        presignedUrl,
        expiresAt
      })
    }
    console.log('filesWithUrls', JSON.stringify(filesWithUrls))

    return NextResponse.json({
      success: true,
      message: `Found ${patientFiles.length} files for patient` ,
      files: filesWithUrls,
      totalFiles: patientFiles.length,
      ...(tenantId && tenantConfig ? { tenant: { id: tenantId, name: tenantConfig.name } } : {})
    })

  } catch (error) {
    console.error('❌ Error in patient files metadata API:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve patient file metadata' },
      { status: 500 }
    )
  }
} 