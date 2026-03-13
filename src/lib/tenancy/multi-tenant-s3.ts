import { put, head } from '@vercel/blob';

export class MultiTenantS3Client {
  static getClient(tenantId: string): any {
    return null; // No longer needed
  }

  static async generatePresignedUrl(
    tenantId: string, 
    url: string, 
    expiresIn: number = 3600
  ): Promise<string> {
    return url;
  }

  static async uploadFile(
    tenantId: string,
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ Location: string; Key: string; Bucket: string }> {
    try {
      const blob = await put(key, body, { 
        access: 'public',
        contentType: contentType,
      });
      console.log(`✅ File uploaded for tenant ${tenantId}: ${key}`);
      return {
        Location: blob.url,
        Key: key,
        Bucket: 'vercel-blob'
      };
    } catch (error) {
      console.error(`❌ Error uploading file for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  static async checkObjectExists(tenantId: string, url: string): Promise<boolean> {
    try {
      if (!url) return false;
      const blobHead = await head(url);
      return !!blobHead;
    } catch (error) {
      return false;
    }
  }

  static async getObjectMetadata(tenantId: string, url: string): Promise<any> {
    try {
      const metadata = await head(url);
      return metadata;
    } catch (error) {
      return null;
    }
  }

  static clearCache(): void {
    console.log('🧹 Cache cleared (not needed for Vercel Blob)');
  }
}