import { head } from '@vercel/blob';

/**
 * Fetch image data from Vercel Blob and return as base64 data URL
 * @param url - URL of the image
 * @returns Promise<string> - Base64 data URL or empty string on error
 */
export async function fetchImageFromS3(url: string): Promise<string> {
  try {
    console.log('🔍 Fetching image from Blob:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Check file size (optional limit for base64 conversion)
    const maxSize = 5 * 1024 * 1024; // 5MB limit
    if (buffer.length > maxSize) {
      console.warn(`⚠️ Image too large for base64 conversion: ${buffer.length} bytes`);
      return '';
    }
    
    // Convert to base64
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return `data:${contentType};base64,${base64}`;
    
  } catch (error) {
    console.error('❌ Error fetching image:', error);
    return '';
  }
}

/**
 * Generate a presigned URL for object access
 * Vercel Blob URLs are public by default unless using private blobs.
 * For now, we will just return the URL itself.
 */
export async function generatePresignedUrl(url: string, expiresIn: number = 3600): Promise<string> {
  return url;
}

/**
 * Check if object exists
 */
export async function checkS3ImageExists(url: string): Promise<boolean> {
  try {
    if (!url) return false;
    const blobHead = await head(url);
    return !!blobHead;
  } catch (error) {
    console.error('❌ object does not exist:', error);
    return false;
  }
}

/**
 * Get image metadata
 */
export async function getS3ImageMetadata(url: string): Promise<unknown> {
  try {
    const metadata = await head(url);
    return {
      contentType: metadata.contentType,
      contentLength: metadata.size,
      lastModified: metadata.uploadedAt,
      etag: ''
    };
  } catch (error) {
    console.error('❌ Error getting metadata:', error);
    return null;
  }
}