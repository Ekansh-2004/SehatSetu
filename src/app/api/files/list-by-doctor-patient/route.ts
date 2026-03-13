import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId') || ''
    const doctorId = searchParams.get('doctorId') || ''
    const tenantId = searchParams.get('tenantId') || undefined

    if (!patientId || !doctorId) {
      return NextResponse.json({ error: 'patientId and doctorId are required' }, { status: 400 })
    }

    const where: Prisma.FileMetadataWhereInput = {
      isActive: true,
      patientId,
      doctorId,
      ...(tenantId ? { tenantId } : {}),
    }

    const files = await prisma.fileMetadata.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      select: {
        uuid: true,
        fileName: true,
        fileExtension: true,
        fileSize: true,
        mimeType: true,
        category: true,
        description: true,
        uploadedAt: true,
        s3Url: true,
        s3Key: true,
      }
    })

    return NextResponse.json({
      success: true,
      data: files,
      count: files.length,
    })
  } catch (error) {
    console.error('List files by doctor and patient error:', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
} 