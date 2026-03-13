export const S3_CONFIG = {
  // Choose your preferred approach:
  // - 'presigned': Generate presigned URLs (recommended for production)
  // - 'base64': Fetch images as base64 data (self-contained but slower)
  // - 'both': Provide both options (most flexible but slower)
  imageDeliveryMethod: 'presigned' as 'presigned' | 'base64' | 'both',
  
  // Presigned URL expiration time in seconds
  presignedUrlExpiry: 3600, // 1 hour
  
  // Maximum image size for base64 conversion (in bytes)
  maxBase64ImageSize: 5 * 1024 * 1024, // 5MB
  
  // AWS region for S3 operations
  defaultRegion: 'ap-south-1',
  
  // Enable image existence checks before processing
  checkImageExists: true,
};

export const getS3Config = () => S3_CONFIG; 