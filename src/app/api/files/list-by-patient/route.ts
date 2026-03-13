import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { FileMetadataService } from '@/lib/db/services/fileMetadataService'
import { FileMetadata } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId') || ''
    const tenantId = searchParams.get('tenantId') || undefined

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 })
    }

    const files = await FileMetadataService.searchFiles('', tenantId, patientId)

    return NextResponse.json({
      success: true,
      data: files.map((f: FileMetadata) => ({
        uuid: f.uuid as string,
        fileName: f.fileName as string,
        fileSize: f.fileSize as number,
        mimeType: f.mimeType as string | undefined,
        category: f.category as string | undefined,
        description: f.description as string | undefined,
        uploadedAt: f.uploadedAt as Date,
        s3Url: f.s3Url as string | undefined,
      })),
    })
  } catch (error) {
    console.error('List files by patient error:', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
} 