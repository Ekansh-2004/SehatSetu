'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface UploadResult {
  uuid: string
  fileName: string
  presignedUrl: string
  s3Url: string
}

interface DownloadResult {
  uuid: string
  fileName: string
  presignedUrl: string
  isUpdated: boolean
  fileSize: number
  mimeType: string
}

export default function TestFeaturesPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [downloadUuid, setDownloadUuid] = useState('')
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Form fields
  const [patientId, setPatientId] = useState('patient-123')
  const [doctorId, setDoctorId] = useState('doctor-456')
  const [category, setCategory] = useState('medical_record')
  const [description, setDescription] = useState('Test file upload')
  const [tenantId, setTenantId] = useState('tenant-789')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Step 1: Get presigned upload URL
      const uploadUrlResponse = await fetch('/api/files/generate-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          patientId,
          doctorId,
          category,
          description,
          tenantId,
          expiresIn: 3600
        })
      })

      const uploadData = await uploadUrlResponse.json()
      
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to get upload URL')
      }

      console.log('✅ Upload URL generated:', uploadData)

      // Step 2: Upload file directly to S3
      const uploadToS3Response = await fetch(uploadData.upload.presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      })

      if (!uploadToS3Response.ok) {
        throw new Error(`S3 upload failed: ${uploadToS3Response.status} ${uploadToS3Response.statusText}`)
      }

      console.log('✅ File uploaded to S3 successfully')

      setUploadResult({
        uuid: uploadData.file.uuid,
        fileName: uploadData.file.fileName,
        presignedUrl: uploadData.upload.presignedUrl,
        s3Url: uploadData.upload.s3Url
      })

      // Auto-populate download field with the uploaded file's UUID
      setDownloadUuid(uploadData.file.uuid)

    } catch (err) {
      console.error('❌ Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!downloadUuid.trim()) {
      setError('Please enter a UUID to download')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Get presigned download URL
      const downloadResponse = await fetch('/api/files/get-presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: downloadUuid.trim(),
          expiresIn: 3600
        })
      })

      const downloadData = await downloadResponse.json()
      
      if (!downloadData.success) {
        throw new Error(downloadData.error || 'Failed to get download URL')
      }

      console.log('✅ Download URL generated:', downloadData)

      setDownloadResult({
        uuid: downloadData.uuid,
        fileName: downloadData.fileName,
        presignedUrl: downloadData.presignedUrl,
        isUpdated: downloadData.isUpdated,
        fileSize: downloadData.fileSize,
        mimeType: downloadData.mimeType
      })

      // Automatically open the download URL
      window.open(downloadData.presignedUrl, '_blank')

    } catch (err) {
      console.error('❌ Download error:', err)
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (uuid: string, isUpdated: boolean) => {
    try {
      const response = await fetch('/api/files/update-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: uuid,
          isUpdated: isUpdated
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ File status updated:', result)
        // Refresh download result if it's the same file
        if (downloadResult?.uuid === uuid) {
          setDownloadResult(prev => prev ? { ...prev, isUpdated } : null)
        }
      } else {
        throw new Error(result.error || 'Failed to update status')
      }
    } catch (err) {
      console.error('❌ Update status error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">File Management Test Page</h1>
        <p className="text-muted-foreground mt-2">Test upload and download functionality with presigned URLs</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">❌ {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>📤 File Upload</CardTitle>
            <CardDescription>Upload a file using presigned URLs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.txt,.doc,.docx"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientId">Patient ID</Label>
                <Input
                  id="patientId"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="patient-123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctorId">Doctor ID</Label>
                <Input
                  id="doctorId"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  placeholder="doctor-456"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical_record">Medical Record</SelectItem>
                    <SelectItem value="consultation_audio">Consultation Audio</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="lab_result">Lab Result</SelectItem>
                    <SelectItem value="imaging">Imaging</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant ID</Label>
                <Input
                  id="tenantId"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="tenant-789"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter file description"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? 'Uploading...' : 'Upload File'}
            </Button>

            {uploadResult && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-green-800 mb-2">✅ Upload Successful!</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>UUID:</strong> <code className="bg-white px-1 rounded">{uploadResult.uuid}</code></p>
                    <p><strong>File:</strong> {uploadResult.fileName}</p>
                    <p><strong>S3 URL:</strong> <code className="bg-white px-1 rounded break-all">{uploadResult.s3Url}</code></p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Download Section */}
        <Card>
          <CardHeader>
            <CardTitle>📥 File Download</CardTitle>
            <CardDescription>Download a file by UUID using presigned URLs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="uuid">File UUID</Label>
              <Input
                id="uuid"
                value={downloadUuid}
                onChange={(e) => setDownloadUuid(e.target.value)}
                placeholder="Enter file UUID"
              />
            </div>

            <Button 
              onClick={handleDownload} 
              disabled={!downloadUuid.trim() || loading}
              className="w-full"
            >
              {loading ? 'Getting Download URL...' : 'Get Download URL'}
            </Button>

            {downloadResult && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-blue-800 mb-2">✅ Download URL Generated!</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>File:</strong> {downloadResult.fileName}</p>
                    <p><strong>Size:</strong> {(downloadResult.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Type:</strong> {downloadResult.mimeType}</p>
                    <p><strong>Updated Status:</strong> 
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${downloadResult.isUpdated ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {downloadResult.isUpdated ? 'Updated' : 'Not Updated'}
                      </span>
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(downloadResult.presignedUrl, '_blank')}
                      >
                        Open File
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUpdateStatus(downloadResult.uuid, !downloadResult.isUpdated)}
                      >
                        Toggle Updated Status
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Test Section */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Quick Test</CardTitle>
          <CardDescription>Upload a file and then immediately test downloading it</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.txt,.doc,.docx"
              />
            </div>
            <Button 
              onClick={async () => {
                await handleUpload()
                // Download will be auto-triggered since uploadResult sets downloadUuid
              }}
              disabled={!file || loading}
            >
              Upload & Get Download URL
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Information */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 API Endpoints</CardTitle>
          <CardDescription>Information about the file management APIs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">POST /api/files/generate-upload-url</code>
              <p className="text-muted-foreground mt-1">Generate presigned URL for uploading files to S3</p>
            </div>
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">POST /api/files/get-presigned-url</code>
              <p className="text-muted-foreground mt-1">Get presigned URL for downloading files by UUID</p>
            </div>
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">PATCH /api/files/update-status</code>
              <p className="text-muted-foreground mt-1">Update file metadata like isUpdated flag</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 