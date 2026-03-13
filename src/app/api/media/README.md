# Multi-Tenant Media API Endpoints

This directory contains HIPAA-compliant, multi-tenant API endpoints for managing patient files and media. Each tenant has their own S3 credentials, database connection, and feature configurations.

## Multi-Tenant Architecture

### Tenant Configuration
Each tenant has:
- **Unique S3 credentials** and bucket
- **Separate database connection** and schema
- **Feature flags** for different capabilities
- **Storage and file limits** per tenant

### Supported Tenants
- `tenant-1`: Main Clinic (Full features)
- `tenant-2`: Downtown Medical (Limited AI features)
- `tenant-3`: Emergency Care (Basic features only)

## Endpoints

### `POST /api/media/patient-files`

Retrieves all files for a specific patient within a tenant and returns presigned URLs for secure access.

**Request Body:**
```json
{
  "tenantId": "tenant-1",
  "patientId": "patient_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Found 3 files for patient",
  "files": [
    {
      "id": "file_id",
      "fileName": "consultation_audio.webm",
      "fileType": "webm",
      "fileSize": 2048576,
      "mimeType": "audio/webm",
      "category": "consultation_audio",
      "description": "Audio recording from consultation",
      "uploadedAt": "2024-01-15T10:30:00.000Z",
      "presignedUrl": "https://s3.amazonaws.com/...",
      "expiresAt": "2024-01-15T11:30:00.000Z"
    }
  ],
  "totalFiles": 3,
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "tenant": {
    "id": "tenant-1",
    "name": "Main Clinic"
  }
}
```

### `GET /api/media/patient-files?tenantId=tenant-1&patientId=patient_id_here`

Retrieves file metadata for a patient without presigned URLs (for listing purposes).

**Response:**
```json
{
  "success": true,
  "message": "Found 3 files for patient",
  "files": [
    {
      "id": "file_id",
      "fileName": "consultation_audio.webm",
      "fileType": "webm",
      "fileSize": 2048576,
      "mimeType": "audio/webm",
      "category": "consultation_audio",
      "description": "Audio recording from consultation",
      "uploadedAt": "2024-01-15T10:30:00.000Z",
      "uploadedBy": "user_id"
    }
  ],
  "totalFiles": 3,
  "tenant": {
    "id": "tenant-1",
    "name": "Main Clinic"
  }
}
```

### `POST /api/media/upload`

Uploads a new file for a patient within a specific tenant.

**Request:** FormData with:
- `file`: The file to upload
- `tenantId`: Tenant ID (required)
- `patientId`: Patient ID (required)
- `category`: File category (optional, default: 'other')
- `description`: File description (optional)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "id": "file_id",
    "fileName": "consultation_audio.webm",
    "fileType": "webm",
    "fileSize": 2048576,
    "category": "consultation_audio",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  },
  "tenant": {
    "id": "tenant-1",
    "name": "Main Clinic"
  }
}
```

## Multi-Tenant Features

### Tenant-Specific Configurations

#### Tenant 1: Main Clinic
- **S3 Bucket**: `test-livconnect-1`
- **Region**: `ap-south-1`
- **Features**: All enabled
- **File Size Limit**: 5MB
- **Storage Limit**: 100GB

#### Tenant 2: Downtown Medical
- **S3 Bucket**: `downtown-medical-files`
- **Region**: `us-east-1`
- **Features**: File upload, audio recording, payment processing
- **File Size Limit**: 10MB
- **Storage Limit**: 50GB

#### Tenant 3: Emergency Care
- **S3 Bucket**: `emergency-care-files`
- **Region**: `us-west-2`
- **Features**: File upload only
- **File Size Limit**: 2MB
- **Storage Limit**: 25GB

### Feature Flags
- `fileUpload`: Enable file upload functionality
- `audioRecording`: Enable audio recording features
- `aiTranscription`: Enable AI transcription services
- `paymentProcessing`: Enable payment processing

### Tenant Limits
- `maxFileSize`: Maximum file size per upload
- `maxFilesPerPatient`: Maximum files per patient
- `maxStoragePerTenant`: Total storage limit per tenant

## HIPAA Compliance Features

### Multi-Tenant Security
- **Tenant Isolation**: Each tenant has separate S3 buckets and databases
- **Credential Separation**: Different AWS credentials per tenant
- **Data Segregation**: Files are stored in tenant-specific paths
- **Access Control**: Tenant validation on all requests

### Authentication & Authorization
- All endpoints require user authentication via Clerk
- User access is logged for audit trails with tenant information
- Patient data access is restricted to authorized users within tenant

### Data Security
- Files are stored in tenant-specific S3 buckets with encrypted access
- Presigned URLs expire after 1 hour
- File metadata is stored in tenant-specific databases
- Soft deletion prevents data loss while maintaining audit trails

### Audit Logging
- All file access is logged with user ID, tenant ID, patient ID, and timestamp
- File uploads are logged with tenant-specific metadata
- Errors are logged for security monitoring with tenant context

### File Validation
- Tenant-specific file size limits
- Allowed file types: PDF, images (JPEG, PNG, WebP), audio (WebM, MP3, WAV), text
- File type validation before upload
- Secure file naming to prevent path traversal

## File Categories

- `medical_record`: General medical records
- `consultation_audio`: Audio recordings from consultations
- `prescription`: Prescription documents
- `lab_result`: Laboratory test results
- `imaging`: Medical imaging files (X-rays, MRIs, etc.)
- `other`: Miscellaneous files

## Usage Examples

### Frontend Usage

```typescript
// Get presigned URLs for patient files
const response = await fetch('/api/media/patient-files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    tenantId: 'tenant-1',
    patientId: 'patient_123' 
  })
})

const data = await response.json()
if (data.success) {
  data.files.forEach(file => {
    console.log(`File: ${file.fileName}, URL: ${file.presignedUrl}`)
  })
}

// Upload a file
const formData = new FormData()
formData.append('file', fileBlob)
formData.append('tenantId', 'tenant-1')
formData.append('patientId', 'patient_123')
formData.append('category', 'consultation_audio')
formData.append('description', 'Audio recording from consultation')

const uploadResponse = await fetch('/api/media/upload', {
  method: 'POST',
  body: formData
})
```

## Environment Variables

Required environment variables for multi-tenancy:

```env
# Tenant 1 Configuration
TENANT_1_AWS_ACCESS_KEY_ID=your_aws_access_key_1
TENANT_1_AWS_SECRET_ACCESS_KEY=your_aws_secret_key_1
TENANT_1_MONGODB_URI=your_mongodb_connection_string_1

# Tenant 2 Configuration
TENANT_2_AWS_ACCESS_KEY_ID=your_aws_access_key_2
TENANT_2_AWS_SECRET_ACCESS_KEY=your_aws_secret_key_2
TENANT_2_MONGODB_URI=your_mongodb_connection_string_2

# Tenant 3 Configuration
TENANT_3_AWS_ACCESS_KEY_ID=your_aws_access_key_3
TENANT_3_AWS_SECRET_ACCESS_KEY=your_aws_secret_key_3
TENANT_3_MONGODB_URI=your_mongodb_connection_string_3

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
```

## Database Schema

The `PatientFile` model includes tenant-specific fields:

- `tenantId`: Links file to specific tenant
- `patientId`: Links file to specific patient within tenant
- `fileName`: Original filename
- `fileType`: File extension
- `fileSize`: File size in bytes
- `s3Key`: S3 object key (includes tenant path)
- `s3Url`: Full S3 URL
- `mimeType`: MIME type
- `category`: File category for organization
- `description`: Optional file description
- `uploadedBy`: User ID who uploaded the file
- `uploadedAt`: Upload timestamp
- `isActive`: Soft delete flag
- `createdAt`/`updatedAt`: Audit timestamps

## Security Considerations

1. **Tenant Isolation**: Each tenant has completely separate storage and databases
2. **Access Control**: All endpoints require authentication and tenant validation
3. **Data Encryption**: Files are stored encrypted in tenant-specific S3 buckets
4. **Audit Trails**: All access is logged with tenant context
5. **Input Validation**: File types and sizes are validated per tenant limits
6. **Secure URLs**: Presigned URLs expire automatically
7. **Soft Deletion**: Files are marked inactive rather than deleted
8. **Rate Limiting**: Consider implementing tenant-specific rate limiting for production
9. **Credential Management**: Each tenant uses separate AWS credentials
10. **Database Separation**: Each tenant has isolated database connections 