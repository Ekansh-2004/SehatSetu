import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { FileMetadataService } from '@/lib/db/services/fileMetadataService'

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';
  
  try {
    console.log('🔗 [DOWNLOAD] Starting download presigned URL request');
    
    // HIPAA Compliance: Verify user authentication
    const user = await currentUser()
    if (!user) {
      console.log('❌ [DOWNLOAD] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }
    
    userId = user.id;
    console.log(`👤 [DOWNLOAD] Authenticated user: ${userId}`);

    const body = await request.json()
    const { uuid, expiresIn = 3600 } = body
    
    console.log(`📋 [DOWNLOAD] Request payload:`, {
      uuid,
      expiresIn: `${expiresIn}s (${(expiresIn / 3600).toFixed(1)} hours)`
    });
    
    console.log(`🔍 [DOWNLOAD] UUID details:`);
    console.log(`   Raw UUID: "${uuid}"`);
    console.log(`   UUID length: ${uuid.length}`);
    console.log(`   UUID trimmed: "${uuid.trim()}"`);
    console.log(`   UUID type: ${typeof uuid}`);
    console.log(`   UUID char codes: [${uuid.split('').slice(0, 10).map((c: string) => c.charCodeAt(0)).join(', ')}...]`);

    if (!uuid) {
      console.log('❌ [DOWNLOAD] Missing UUID in request');
      return NextResponse.json(
        { error: 'UUID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format (basic validation)
    if (typeof uuid !== 'string' || uuid.length < 10) {
      console.log(`❌ [DOWNLOAD] Invalid UUID format: ${uuid}`);
      return NextResponse.json(
        { error: 'Invalid UUID format' },
        { status: 400 }
      )
    }
    
    console.log(`✅ [DOWNLOAD] UUID validation passed:${uuid}`);

    // Get file metadata and presigned URL
    console.log(`💾 [DOWNLOAD] Fetching file metadata and generating presigned URL...`);
    const result = await FileMetadataService.getPresignedUrlByUuid(uuid, expiresIn)

    if (!result) {
      console.log(`❌ [DOWNLOAD] File not found or access denied for UUID: ${uuid}`);
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      )
    }
    
    console.log(`✅ [DOWNLOAD] File found: ${result.fileMetadata.fileName}`);
    console.log(`🔗 [DOWNLOAD] Presigned URL generated successfully`);

    // HIPAA Compliance: Log file access
    const processingTime = Date.now() - startTime;
    console.log(`🔐 [DOWNLOAD] COMPLETED - User: ${user.id}, UUID: ${uuid}, File: ${result.fileMetadata.fileName}, Size: ${result.fileMetadata.fileSize ? (result.fileMetadata.fileSize / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'}, ProcessingTime: ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      uuid: uuid,
      fileName: result.fileMetadata.fileName,
      fileSize: result.fileMetadata.fileSize,
      mimeType: result.fileMetadata.mimeType,
      category: result.fileMetadata.category,
      description: result.fileMetadata.description,
      isUpdated: result.fileMetadata.isUpdated,
      uploadedAt: result.fileMetadata.uploadedAt,
      accessCount: result.fileMetadata.accessCount,
      presignedUrl: result.presignedUrl,
      expiresAt: result.expiresAt,
      patient: null, // Patient info not included in metadata
      doctor: null, // Doctor info not included in metadata
    })

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ [DOWNLOAD] ERROR in get presigned URL API:', error);
    
    // HIPAA Compliance: Log errors for audit trail
    console.error(`🔐 [DOWNLOAD] FAILED - User: ${userId}, ProcessingTime: ${processingTime}ms, Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Log stack trace in development
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error(`🔗 [DOWNLOAD] Stack trace:`, error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate presigned URL',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// GET method to get file metadata without presigned URL
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';
  
  try {
    console.log('📊 [METADATA] Starting file metadata request');
    
    // HIPAA Compliance: Verify user authentication
    const user = await currentUser()
    if (!user) {
      console.log('❌ [METADATA] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }
    
    userId = user.id;
    console.log(`👤 [METADATA] Authenticated user: ${userId}`);

    const { searchParams } = new URL(request.url)
    const uuid = searchParams.get('uuid')

    if (!uuid) {
      console.log('❌ [METADATA] Missing UUID parameter');
      return NextResponse.json(
        { error: 'UUID is required' },
        { status: 400 }
      )
    }
    
    console.log(`🔍 [METADATA] Fetching metadata for UUID: ${uuid}`);

    // Get file metadata only (no presigned URL)
    const fileMetadata = await FileMetadataService.getFileMetadataByUuid(uuid)

    if (!fileMetadata) {
      console.log(`❌ [METADATA] File not found for UUID: ${uuid}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ [METADATA] COMPLETED - File: ${fileMetadata.fileName}, Size: ${fileMetadata.fileSize ? (fileMetadata.fileSize / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'}, ProcessingTime: ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      uuid: uuid,
      fileName: fileMetadata.fileName,
      fileSize: fileMetadata.fileSize,
      mimeType: fileMetadata.mimeType,
      category: fileMetadata.category,
      description: fileMetadata.description,
      isUpdated: fileMetadata.isUpdated,
      uploadedAt: fileMetadata.uploadedAt,
      accessCount: fileMetadata.accessCount,
      patient: null, // Patient info not included in metadata
      doctor: null // Doctor info not included in metadata
    })

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ [METADATA] ERROR in get file metadata API:', error);
    console.error(`📊 [METADATA] FAILED - User: ${userId}, ProcessingTime: ${processingTime}ms, Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Log stack trace in development
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error(`📊 [METADATA] Stack trace:`, error.stack);
    }
    
    return NextResponse.json(
      { error: 'Failed to retrieve file metadata' },
      { status: 500 }
    )
  }
} 