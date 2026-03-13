import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { FileMetadataService, UpdateFileMetadataData } from '@/lib/db/services/fileMetadataService'
import { FileMetadata } from '@prisma/client'

export async function PATCH(request: NextRequest) {
  // HIPAA Compliance: Verify user authentication
  const user = await currentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized access' },
      { status: 401 }
    )
  }

  try {

    const body = await request.json()
    const { uuid, isUpdated, description, category } = body

    if (!uuid) {
      return NextResponse.json(
        { error: 'UUID is required' },
        { status: 400 }
      )
    }

    // Prepare updates object
    const updates: Partial<FileMetadata> = {}
    if (typeof isUpdated === 'boolean') updates.isUpdated = isUpdated
    if (description !== undefined && description !== null) updates.description = description
    if (category !== undefined && category !== null) updates.category = category

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'At least one field to update is required' },
        { status: 400 }
      )
    }

    // Update file metadata
    const updatedFile = await FileMetadataService.updateFileMetadata(uuid, updates as UpdateFileMetadataData)

    if (!updatedFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // HIPAA Compliance: Log file update
    console.log(`🔄 File updated - User: ${user.id}, UUID: ${uuid}, Updates: ${JSON.stringify(updates)}, Time: ${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      message: 'File metadata updated successfully',
      file: {
        uuid: updatedFile.uuid,
        fileName: updatedFile.fileName,
        isUpdated: updatedFile.isUpdated,
        category: updatedFile.category,
        description: updatedFile.description,
        updatedAt: updatedFile.updatedAt
      }
    })
  } catch (error) {
    console.error('❌ Error in update file status API:', error)
    
    // HIPAA Compliance: Log errors for audit trail
    const userId = user?.id || 'unknown'
    console.error(`🔄 File update error - User: ${userId}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    return NextResponse.json(
      { 
        error: 'Failed to update file metadata',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// PUT method for bulk operations
export async function PUT(request: NextRequest) {
  // HIPAA Compliance: Verify user authentication
  const user = await currentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized access' },
      { status: 401 }
    )
  }

  try {

    const body = await request.json()
    const { operation, uuids } = body

    if (!operation || !Array.isArray(uuids) || uuids.length === 0) {
      return NextResponse.json(
        { error: 'Operation and UUIDs array are required' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    for (const uuid of uuids) {
      try {
        let result
        switch (operation) {
          case 'mark-updated':
            result = await FileMetadataService.markFileAsUpdated(uuid)
            break
          case 'mark-not-updated':
            result = await FileMetadataService.markFileAsNotUpdated(uuid)
            break
          case 'delete':
            result = await FileMetadataService.deleteFile(uuid)
            break
          default:
            errors.push({ uuid, error: 'Invalid operation' })
            continue
        }
        
        if (result) {
          results.push({ uuid, success: true })
        } else {
          errors.push({ uuid, error: 'File not found' })
        }
      } catch (error) {
        errors.push({ 
          uuid, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // HIPAA Compliance: Log bulk operation
    console.log(`🔄 Bulk file operation - User: ${user.id}, Operation: ${operation}, Success: ${results.length}, Errors: ${errors.length}, Time: ${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      message: `Bulk operation completed. ${results.length} successful, ${errors.length} errors.`,
      results,
      errors
    })

  } catch (error) {
    console.error('❌ Error in bulk file operation API:', error)
    
    // HIPAA Compliance: Log errors for audit trail
    const userId = user?.id || 'unknown'
    console.error(`🔄 Bulk operation error - User: ${userId}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    return NextResponse.json(
      { 
        error: 'Failed to perform bulk operation',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 