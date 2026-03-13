# MySQL-Based File Management System

## Overview

This document describes the new MySQL-based file management system that replaces the MongoDB file storage. The new system provides better performance, ACID compliance, and easier integration with your existing Prisma-based application.

## Architecture

### Database Structure

**New MySQL Table: `file_metadata`**
```sql
CREATE TABLE file_metadata (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  uuid VARCHAR(191) UNIQUE NOT NULL,           -- Unique identifier for file access
  fileName VARCHAR(191) NOT NULL,              -- Original file name
  fileExtension VARCHAR(191),                  -- File extension
  fileSize INT,                                -- File size in bytes
  mimeType VARCHAR(191),                       -- MIME type
  s3Key VARCHAR(191) NOT NULL,                 -- S3 object key
  s3Bucket VARCHAR(191) NOT NULL,              -- S3 bucket name
  s3Url TEXT,                                  -- Full S3 URL
  tenantId VARCHAR(191),                       -- Multi-tenant support
  patientId VARCHAR(191),                      -- Associated patient
  doctorId VARCHAR(191),                       -- Associated doctor
  category VARCHAR(191) DEFAULT 'other',       -- File category
  description TEXT,                            -- File description
  isUpdated BOOLEAN DEFAULT false,             -- Update status flag
  isActive BOOLEAN DEFAULT true,               -- Soft delete flag
  uploadedBy VARCHAR(191),                     -- Uploader user ID
  uploadedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  lastAccessedAt DATETIME(3),                  -- Last access timestamp
  accessCount INT DEFAULT 0,                   -- Access tracking
  createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) ON UPDATE CURRENT_TIMESTAMP(3)
);
```

### Flow Diagrams

**Upload Flow:**
```
Client Requests Upload
       ↓
1. POST /api/files/generate-upload-url
   { "fileName": "doc.pdf", "fileSize": 1024, "mimeType": "application/pdf" }
       ↓
2. MySQL: INSERT file_metadata (generates UUID)
       ↓
3. S3 Presigned URL Generation (PUT)
       ↓
4. Return: { presignedUrl, uuid, s3Key }
       ↓
Client Uploads Directly to S3 (PUT request)
```

**Download Flow:**
```
Doctor Requests File
       ↓
1. POST /api/files/get-presigned-url
   { "uuid": "file-uuid-here" }
       ↓
2. MySQL Query: SELECT * FROM file_metadata WHERE uuid = ?
       ↓
3. S3 Presigned URL Generation (GET)
       ↓
4. Return: { presignedUrl, fileMetadata, expiresAt }
       ↓
Doctor Downloads File via Presigned URL
```

## API Endpoints

### 1. Generate Upload URL (Presigned)
**POST** `/api/files/generate-upload-url`

**Request:**
```javascript
fetch('/api/files/generate-upload-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileName: 'xray-results.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    patientId: 'patient-123',
    doctorId: 'doctor-456',
    category: 'medical_record',
    description: 'X-ray results',
    tenantId: 'tenant-789',
    expiresIn: 3600 // 1 hour
  })
});
```

**Response:**
```json
{
  "success": true,
  "message": "Presigned upload URL generated successfully",
  "upload": {
    "uuid": "clx123456789",
    "presignedUrl": "https://bucket.s3.amazonaws.com/files/...?AWSAccessKeyId=...",
    "s3Key": "files/tenant-789/clx123456789/1705316200000-xray-results.pdf",
    "s3Url": "https://bucket.s3.amazonaws.com/files/...",
    "expiresAt": "2024-01-15T11:30:00.000Z",
    "uploadMethod": "PUT"
  },
  "file": {
    "uuid": "clx123456789",
    "fileName": "xray-results.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "category": "medical_record",
    "description": "X-ray results",
    "isUpdated": false,
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  },
  "instructions": {
    "method": "PUT",
    "headers": {
      "Content-Type": "application/pdf"
    },
    "note": "Upload the file directly to the presignedUrl using PUT method"
  }
}
```

### 2. Get Presigned URL (Main Doctor Endpoint)
**POST** `/api/files/get-presigned-url`

**Request:**
```javascript
fetch('/api/files/get-presigned-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    uuid: 'clx123456789',
    expiresIn: 3600 // 1 hour
  })
});
```

**Response:**
```json
{
  "success": true,
  "uuid": "clx123456789",
  "fileName": "xray-results.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf",
  "category": "medical_record",
  "description": "X-ray results",
  "isUpdated": false,
  "uploadedAt": "2024-01-15T10:30:00.000Z",
  "accessCount": 5,
  "presignedUrl": "https://bucket.s3.amazonaws.com/files/...?AWSAccessKeyId=...",
  "expiresAt": "2024-01-15T11:30:00.000Z",
  "patient": {
    "id": "patient-123",
    "name": "John Doe"
  },
  "doctor": {
    "id": "doctor-456",
    "name": "Dr. Smith"
  }
}
```

### 3. Update File Status
**PATCH** `/api/files/update-status`

**Request:**
```javascript
fetch('/api/files/update-status', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    uuid: 'clx123456789',
    isUpdated: true,
    description: 'Updated description'
  })
});
```

### 4. Bulk Operations
**PUT** `/api/files/update-status`

**Request:**
```javascript
fetch('/api/files/update-status', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    operation: 'mark-updated', // 'mark-updated', 'mark-not-updated', 'delete'
    uuids: ['uuid1', 'uuid2', 'uuid3']
  })
});
```

### 5. List Files
**GET** `/api/files/upload?patientId=patient-123&category=medical_record`

**Query Parameters:**
- `patientId` - Filter by patient
- `doctorId` - Filter by doctor
- `tenantId` - Filter by tenant
- `category` - Filter by category
- `search` - Search in filename/description

## Usage Examples

### Doctor Downloading a File

```javascript
// 1. Doctor has a UUID (from patient record, appointment, etc.)
const fileUuid = 'clx123456789';

// 2. Request presigned URL
const response = await fetch('/api/files/get-presigned-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ uuid: fileUuid })
});

const data = await response.json();

// 3. Use presigned URL to download file
if (data.success) {
  window.open(data.presignedUrl, '_blank');
  // or download programmatically
  const fileResponse = await fetch(data.presignedUrl);
  const blob = await fileResponse.blob();
  // Handle blob...
}
```

### Uploading a File (Presigned URL Flow)

```javascript
const handleFileUpload = async (file, patientId, doctorId) => {
  // Step 1: Request presigned upload URL
  const uploadUrlResponse = await fetch('/api/files/generate-upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      patientId: patientId,
      doctorId: doctorId,
      category: 'medical_record',
      description: 'Patient consultation file'
    })
  });

  const uploadData = await uploadUrlResponse.json();
  
  if (!uploadData.success) {
    throw new Error('Failed to get upload URL');
  }

  // Step 2: Upload file directly to S3 using presigned URL
  const uploadResponse = await fetch(uploadData.upload.presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  });

  if (uploadResponse.ok) {
    console.log('File uploaded successfully:', uploadData.file.uuid);
    // Store UUID in your application (appointment record, etc.)
    return uploadData.file.uuid;
  } else {
    throw new Error('Failed to upload file to S3');
  }
};
```

### Updating File Status

```javascript
const markFileAsUpdated = async (uuid) => {
  const response = await fetch('/api/files/update-status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uuid: uuid,
      isUpdated: true
    })
  });

  return response.json();
};
```

## Service Layer Usage

You can also use the service layer directly in your backend code:

```javascript
import { FileMetadataService } from '@/lib/db/services/fileMetadataService';

// Get file metadata and presigned URL
const result = await FileMetadataService.getPresignedUrlByUuid('uuid-here');

// Create file metadata
const fileMetadata = await FileMetadataService.createFileMetadata({
  fileName: 'document.pdf',
  s3Key: 'files/...',
  s3Bucket: 'my-bucket',
  patientId: 'patient-123'
});

// Mark file as updated
await FileMetadataService.markFileAsUpdated('uuid-here');

// Search files
const files = await FileMetadataService.searchFiles('xray', 'tenant-id');
```

## Migration from MongoDB

To migrate existing files from MongoDB to MySQL:

1. **Run the Prisma migration:**
   ```bash
   npx prisma migrate dev --name add_file_metadata_table
   ```

2. **Create migration script:**
   ```javascript
   // scripts/migrate-files-to-mysql.ts
   import { PatientFileService } from '@/lib/db/services/patientFileService';
   import { FileMetadataService } from '@/lib/db/services/fileMetadataService';

   // Fetch all files from MongoDB
   const mongoFiles = await PatientFileService.getAllFiles();

   // Migrate each file to MySQL
   for (const file of mongoFiles) {
     await FileMetadataService.createFileMetadata({
       fileName: file.fileName,
       fileExtension: file.fileType,
       fileSize: file.fileSize,
       mimeType: file.mimeType,
       s3Key: file.s3Key,
       s3Bucket: extractBucketFromUrl(file.s3Url),
       s3Url: file.s3Url,
       tenantId: file.tenantId,
       patientId: file.patientId,
       category: file.category,
       description: file.description,
       uploadedBy: file.uploadedBy
     });
   }
   ```

## Security & HIPAA Compliance

- **Authentication Required:** All endpoints require valid Clerk authentication
- **Audit Logging:** All file access and modifications are logged
- **Presigned URL Expiration:** URLs expire after 1 hour by default
- **Access Tracking:** System tracks access count and last accessed time
- **Soft Deletes:** Files are marked as inactive instead of hard deletion

## Performance Features

- **Indexed Queries:** Optimized indexes for UUID, tenant, patient, and doctor lookups
- **Access Tracking:** Automatic increment of access counters
- **Batch Operations:** Support for bulk status updates
- **Search Capabilities:** Full-text search on filename and description

## Environment Variables

```env
DATABASE_URL="mysql://user:password@localhost:3306/database"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-south-1"
AWS_S3_BUCKET="your-bucket-name"
```

## File Categories

Supported file categories:
- `medical_record`
- `consultation_audio`
- `prescription`
- `lab_result`
- `imaging`
- `other` (default) 