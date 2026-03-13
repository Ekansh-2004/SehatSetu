"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  FolderOpen,
  Upload,
  Shield,
  Search,
  Filter,
  Eye,
  Download,
  X,
  CheckCircle2,
  FileImage,
  File,
  Clock,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface MedicalDocument {
  uuid: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  description?: string;
  uploadedAt: string;
  s3Key?: string;
}

const categoryOptions = [
  { value: "medical_record", label: "Medical Record", icon: FileText },
  { value: "lab_result", label: "Lab Result", icon: FileText },
  { value: "prescription", label: "Prescription", icon: FileText },
  { value: "imaging", label: "Imaging (X-ray, MRI, etc.)", icon: FileImage },
  { value: "dicom", label: "DICOM Image", icon: FileImage },
  { value: "insurance", label: "Insurance Document", icon: File },
  { value: "other", label: "Other", icon: File },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function PatientDocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ url: string; fileName: string; mimeType: string } | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    category: "medical_record",
    description: "",
  });

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/patient/documents");
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/dicom',
      'application/octet-stream', 
    ];

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isDicomFile = fileExtension === 'dcm' || fileExtension === 'dicom';

    if (!allowedTypes.includes(file.type) && !isDicomFile) {
      toast.error("File type not allowed. Please upload PDF, images, documents, or DICOM files.");
      return;
    }

    const maxSize = isDicomFile ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${isDicomFile ? '100MB' : '50MB'}.`);
      return;
    }

    if (isDicomFile) {
      setUploadData(prev => ({ ...prev, file, category: 'dicom' }));
    } else {
      setUploadData(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!uploadData.file) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);

    try {
      // Determine MIME type - browsers may not recognize DICOM files
      const fileExtension = uploadData.file.name.split('.').pop()?.toLowerCase();
      const isDicom = fileExtension === 'dcm' || fileExtension === 'dicom';
      const mimeType = uploadData.file.type || (isDicom ? 'application/dicom' : 'application/octet-stream');

      // Step 1: Get presigned URL
      const metadataResponse = await fetch("/api/patient/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: uploadData.file.name,
          fileSize: uploadData.file.size,
          mimeType: mimeType,
          category: uploadData.category,
          description: uploadData.description,
        }),
      });

      const metadataData = await metadataResponse.json();

      if (!metadataData.success) {
        throw new Error(metadataData.error || "Failed to initiate upload");
      }

      // Step 2: Upload to S3
      const uploadResponse = await fetch(metadataData.data.presignedUrl, {
        method: "PUT",
        body: uploadData.file,
        headers: {
          "Content-Type": mimeType,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      toast.success("Document uploaded successfully");
      setUploadDialogOpen(false);
      setUploadData({ file: null, category: "medical_record", description: "" });
      fetchDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return FileImage;
    return FileText;
  };

  const getCategoryConfig = (category: string) => {
    const config = categoryOptions.find(c => c.value === category);
    return config || categoryOptions[5]; // Default to "other"
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleViewDocument = async (doc: MedicalDocument) => {
    setLoadingDocument(true);
    try {
      const response = await fetch(`/api/patient/documents/${doc.uuid}?action=view`);
      const data = await response.json();

      if (data.success && data.data.url) {
        setViewingDocument({
          url: data.data.url,
          fileName: data.data.fileName,
          mimeType: data.data.mimeType,
        });
        setViewDialogOpen(true);
      } else {
        toast.error(data.error || "Failed to load document");
      }
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Failed to view document");
    } finally {
      setLoadingDocument(false);
    }
  };

  const handleDownloadDocument = async (doc: MedicalDocument) => {
    try {
      const response = await fetch(`/api/patient/documents/${doc.uuid}?action=download`);
      const data = await response.json();

      if (data.success && data.data.url) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.data.url;
        link.download = doc.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error(data.error || "Failed to download document");
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Medical Documents</h1>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <Shield className="h-3 w-3 mr-1" />
              HIPAA Secured
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">Securely upload and manage your medical records</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-violet-600" />
                Upload Medical Document
              </DialogTitle>
              <DialogDescription>
                Your documents are encrypted and stored securely in compliance with HIPAA regulations.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  dragActive
                    ? "border-violet-500 bg-violet-50"
                    : uploadData.file
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,.dcm,.dicom"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                {uploadData.file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                    <p className="font-medium text-gray-900">{uploadData.file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(uploadData.file.size)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadData(prev => ({ ...prev, file: null }));
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 text-gray-400 mx-auto" />
                    <p className="font-medium text-gray-700">Drop your file here or click to browse</p>
                    <p className="text-sm text-gray-500">PDF, Images, Documents up to 50MB • DICOM files up to 100MB</p>
                  </div>
                )}
              </div>

              {/* Category Select */}
              <div className="space-y-2">
                <Label>Document Category</Label>
                <Select
                  value={uploadData.category}
                  onValueChange={(value) => setUploadData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="h-4 w-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add notes about this document..."
                  className="resize-none"
                  rows={3}
                />
              </div>

              {/* HIPAA Notice */}
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <Lock className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-700">Secure & HIPAA Compliant</p>
                  <p className="text-gray-600">Your documents are encrypted at rest and in transit. Access is strictly controlled.</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!uploadData.file || uploading}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="py-16 text-center">
              <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Documents Found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || categoryFilter !== "all"
                  ? "No documents match your search criteria"
                  : "You haven't uploaded any medical documents yet"}
              </p>
              <Button
                className="bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Document
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => {
            const FileIcon = getFileIcon(doc.mimeType);
            const categoryConfig = getCategoryConfig(doc.category);

            return (
              <motion.div key={doc.uuid} variants={itemVariants}>
                <Card className="bg-white border-gray-200 hover:border-violet-200 transition-all group h-full shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-violet-100 rounded-xl">
                        <FileIcon className="h-6 w-6 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate mb-1">{doc.fileName}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs border-gray-200 text-gray-500">
                            {categoryConfig.label}
                          </Badge>
                          <span className="text-xs text-gray-400">{formatFileSize(doc.fileSize)}</span>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(doc.uploadedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDocument(doc);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDocument(doc);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* HIPAA Compliance Footer */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-center gap-3 py-6 text-sm text-gray-500">
          <Shield className="h-4 w-4 text-emerald-600" />
          <span>All documents are encrypted and stored in compliance with HIPAA regulations</span>
        </div>
      </motion.div>

      {/* Document Viewer Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] bg-white">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-600" />
              {viewingDocument?.fileName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden mt-4">
            {loadingDocument ? (
              <div className="flex items-center justify-center h-[70vh]">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-violet-200 rounded-full animate-spin border-t-violet-600 mx-auto mb-4" />
                  <p className="text-gray-500">Loading document...</p>
                </div>
              </div>
            ) : viewingDocument ? (
              <div className="w-full h-[70vh] border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                {viewingDocument.mimeType === 'application/pdf' ? (
                  <iframe
                    src={viewingDocument.url}
                    className="w-full h-full"
                    title={viewingDocument.fileName}
                  />
                ) : viewingDocument.mimeType.startsWith('image/') ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={viewingDocument.url}
                      alt={viewingDocument.fileName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Preview not available for this file type</p>
                      <p className="text-sm text-gray-400 mt-2">Please download to view</p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Secure document access</span>
              </div>
              <div className="flex gap-2">
                {viewingDocument && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = viewingDocument.url.replace('inline', 'attachment');
                      link.download = viewingDocument.fileName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  onClick={() => setViewDialogOpen(false)}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
