import { prisma } from '../prisma'
import { generatePresignedUrl } from '@/lib/s3-client'

export interface CreateFileMetadataData {
  fileName: string
  fileExtension?: string
  fileSize?: number
  mimeType?: string
  s3Key: string
  s3Bucket: string
  s3Url?: string
  tenantId?: string
  patientId?: string
  doctorId?: string
  category?: string
  description?: string
  uploadedBy?: string
}

export interface UpdateFileMetadataData {
  fileName?: string
  description?: string
  isUpdated?: boolean
  category?: string
  lastAccessedAt?: Date
  s3Key?: string
  s3Url?: string
}

export class FileMetadataService {
  /**
   * Create a new file metadata record
   */
  static async createFileMetadata(data: CreateFileMetadataData) {
    try {
      const fileMetadata = await prisma.fileMetadata.create({
        data: {
          ...data,
          uploadedAt: new Date(),
        }
      })

      return fileMetadata
    } catch (error) {
      console.error('❌ Error creating file metadata:', error)
      throw new Error(`Failed to create file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get file metadata by UUID
   */
  static async getFileMetadataByUuid(uuid: string) {
    try {
      console.log(`🔍 [FILE-SERVICE] Received UUID: "${uuid}"`);
      console.log(`🔍 [FILE-SERVICE] UUID length: ${uuid.length}, type: ${typeof uuid}`);
      console.log(`🔍 [FILE-SERVICE] UUID trimmed: "${uuid.trim()}"`);
      console.log(`🔍 [FILE-SERVICE] UUID char codes: [${uuid.split('').slice(0, 10).map(c => c.charCodeAt(0)).join(', ')}...]`);
      
      const fileMetadata = await prisma.fileMetadata.findUnique({
        where: {
          uuid: uuid.trim(), // Try trimming the UUID
        },
        // include: {
        //   patient: {
        //     select: { id: true, name: true, email: true }
        //   },
        //   doctor: {
        //     select: { id: true, name: true, email: true }
        //   }
        // }
      })
     
      // console.log(fileMetadata,"@123")
      console.log(`🔍 [FILE-SERVICE] Query result:`, fileMetadata ? `Found "${fileMetadata.fileName}"` : 'NULL');
      if (!fileMetadata) {
        return null
      }

      // Update access tracking
      await this.updateAccessTracking(uuid)

      return fileMetadata
    } catch (error) {
      console.error('❌ Error fetching file metadata by UUID:', error)
      throw new Error(`Failed to fetch file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get presigned URL by UUID (main functionality for doctor access)
   */
  static async getPresignedUrlByUuid(uuid: string, expiresIn: number = 3600) {
    try {
      // First, get file metadata from MySQL
      const fileMetadata = await this.getFileMetadataByUuid(uuid)
      console.log('🔍 [DOWNLOAD] File metadata:', fileMetadata)
      if (!fileMetadata) {
        throw new Error('File not found')
      }

      // Generate presigned URL from S3
      let presignedUrl: string
      if (fileMetadata.s3Url) {
        presignedUrl = await generatePresignedUrl(fileMetadata.s3Url, expiresIn)
      } else {
        // Construct S3 URL if not stored
        const s3Url = `https://${fileMetadata.s3Bucket}.s3.amazonaws.com/${fileMetadata.s3Key}`
        presignedUrl = await generatePresignedUrl(s3Url, expiresIn)
      }

      if (!presignedUrl) {
        throw new Error('Failed to generate presigned URL')
      }

      return {
        fileMetadata,
        presignedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      }
    } catch (error) {
      console.error('❌ Error getting presigned URL by UUID:', error)
      throw new Error(`Failed to get presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get files by patient ID
   */
  static async getFilesByPatientId(patientId: string, tenantId?: string) {
    try {
      const whereClause: { patientId: string; isActive: boolean; tenantId?: string } = {
        patientId: patientId,
        isActive: true
      }

      if (tenantId) {
        whereClause.tenantId = tenantId
      }

      const files = await prisma.fileMetadata.findMany({
        where: whereClause,
        orderBy: { uploadedAt: 'desc' },
        include: {
          doctor: {
            select: { id: true, name: true }
          }
        }
      })

      return files
    } catch (error) {
      console.error('❌ Error fetching files by patient ID:', error)
      throw new Error(`Failed to fetch patient files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get files by doctor ID
   */
  static async getFilesByDoctorId(doctorId: string, tenantId?: string) {
    try {
      const whereClause: { doctorId: string; isActive: boolean; tenantId?: string } = {
        doctorId: doctorId,
        isActive: true
      }

      if (tenantId) {
        whereClause.tenantId = tenantId
      }

      const files = await prisma.fileMetadata.findMany({
        where: whereClause,
        orderBy: { uploadedAt: 'desc' },
        include: {
          patient: {
            select: { id: true, name: true }
          }
        }
      })

      return files
    } catch (error) {
      console.error('❌ Error fetching files by doctor ID:', error)
      throw new Error(`Failed to fetch doctor files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update file metadata
   */
  static async updateFileMetadata(uuid: string, updates: UpdateFileMetadataData) {
    try {
      const fileMetadata = await prisma.fileMetadata.update({
        where: {
          uuid: uuid,
          isActive: true
        },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      })

      return fileMetadata
    } catch (error) {
      console.error('❌ Error updating file metadata:', error)
      throw new Error(`Failed to update file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update S3 details after presigned URL upload
   */
  static async updateS3Details(uuid: string, s3Key: string, s3Url?: string) {
    return this.updateFileMetadata(uuid, {
      s3Key: s3Key,
      s3Url: s3Url,
      lastAccessedAt: new Date()
    })
  }

  /**
   * Mark file as updated
   */
  static async markFileAsUpdated(uuid: string) {
    return this.updateFileMetadata(uuid, { 
      isUpdated: true,
      lastAccessedAt: new Date()
    })
  }

  /**
   * Mark file as not updated
   */
  static async markFileAsNotUpdated(uuid: string) {
    return this.updateFileMetadata(uuid, { 
      isUpdated: false 
    })
  }

  /**
   * Soft delete file
   */
  static async deleteFile(uuid: string) {
    try {
      const fileMetadata = await prisma.fileMetadata.update({
        where: {
          uuid: uuid
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      })

      return fileMetadata
    } catch (error) {
      console.error('❌ Error deleting file metadata:', error)
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update access tracking (increment access count and update last accessed time)
   */
  private static async updateAccessTracking(uuid: string) {
    try {
      await prisma.fileMetadata.update({
        where: { uuid },
        data: {
          accessCount: { increment: 1 },
          lastAccessedAt: new Date()
        }
      })
    } catch (error) {
      console.error('❌ Error updating access tracking:', error)
      // Don't throw error here as this is secondary functionality
    }
  }

  /**
   * Search files by filename or description
   */
  static async searchFiles(searchTerm: string, tenantId?: string, patientId?: string, doctorId?: string) {
    try {
      const whereClause: { 
        isActive: boolean; 
        OR: Array<{ fileName?: { contains: string; mode: string }; description?: { contains: string; mode: string } }>;
        tenantId?: string;
        patientId?: string;
        doctorId?: string;
      } = {
        isActive: true,
        OR: [
          { fileName: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }

      if (tenantId) whereClause.tenantId = tenantId
      if (patientId) whereClause.patientId = patientId
      if (doctorId) whereClause.doctorId = doctorId

      const files = await prisma.fileMetadata.findMany({
        where: whereClause,
        orderBy: { uploadedAt: 'desc' },
        include: {
          patient: {
            select: { id: true, name: true }
          },
          doctor: {
            select: { id: true, name: true }
          }
        }
      })

      return files
    } catch (error) {
      console.error('❌ Error searching files:', error)
      throw new Error(`Failed to search files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get file statistics
   */
  static async getFileStatistics(tenantId?: string) {
    try {
      const whereClause: { isActive: boolean; tenantId?: string } = { isActive: true }
      if (tenantId) whereClause.tenantId = tenantId

      const [totalFiles, totalSize, categoryStats] = await Promise.all([
        // Total file count
        prisma.fileMetadata.count({ where: whereClause }),
        
        // Total file size
        prisma.fileMetadata.aggregate({
          where: whereClause,
          _sum: { fileSize: true }
        }),
        
        // Files by category
        prisma.fileMetadata.groupBy({
          by: ['category'],
          where: whereClause,
          _count: { category: true },
          _sum: { fileSize: true }
        })
      ])

      return {
        totalFiles,
        totalSize: totalSize._sum.fileSize || 0,
        categoryBreakdown: categoryStats
      }
    } catch (error) {
      console.error('❌ Error getting file statistics:', error)
      throw new Error(`Failed to get file statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
} 