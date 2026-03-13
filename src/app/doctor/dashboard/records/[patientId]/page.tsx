"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Scan, 
  FileText, 
  ExternalLink, 
  Eye, 
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  HardDrive,
  FolderOpen,
  FileImage,
  File,
  Loader2,
  Download
} from "lucide-react";

interface FileItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  category: string;
  description?: string;
  uploadedAt: string;
  uploadedBy?: string;
  presignedUrl?: string;
}

function isDicomFile(file: FileItem): boolean {
  const extension = file.fileName.split('.').pop()?.toLowerCase();
  return (
    extension === 'dcm' || 
    extension === 'dicom' || 
    file.mimeType === 'application/dicom' ||
    file.category === 'dicom'
  );
}

function getFileIcon(file: FileItem) {
  if (isDicomFile(file)) return Scan;
  if (file.mimeType?.startsWith('image/')) return FileImage;
  if (file.mimeType === 'application/pdf') return FileText;
  return File;
}

function getCategoryColor(category: string) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    dicom: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    imaging: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    lab_result: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    prescription: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    medical_record: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    insurance: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  };
  return colors[category] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
}

function formatCategory(category: string) {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
  const params = useParams<{ patientId: string }>();
  const patientId = params?.patientId;

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      if (!patientId) return;
      setLoading(true);
      setError(null);
      try {
        const url = `/api/media/patient-files?tenantId=default&patientId=${encodeURIComponent(patientId)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load files");
        setFiles((data.files || []) as FileItem[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId]);

  const categories = useMemo(() => {
    const cats = new Set(files.map(f => f.category));
    return Array.from(cats);
  }, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const matchesSearch = f.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [files, searchQuery, categoryFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-[80vh] space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/doctor/dashboard/records')}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Search
        </Button>
      </motion.div>

      {/* Filters */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md bg-white rounded-xl">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-gray-50 border-gray-200 rounded-lg"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-10 bg-gray-50 border-gray-200 rounded-lg">
                    <Filter className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {formatCategory(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          /* Loading State */
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <div className="text-center">
              <Loader2 className="h-10 w-10 text-teal-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading documents...</p>
            </div>
          </motion.div>
        ) : error ? (
          /* Error State */
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-0 shadow-lg bg-white rounded-2xl">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Error Loading Documents</h3>
                <p className="text-red-500 text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : filteredFiles.length === 0 ? (
          /* Empty State */
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 rounded-2xl">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center">
                  <FolderOpen className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {files.length === 0 ? 'No Documents Found' : 'No Matching Documents'}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {files.length === 0 
                    ? "This patient hasn't uploaded any medical documents yet."
                    : "Try adjusting your search or filter criteria."}
                </p>
                {files.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Documents Grid */
          <motion.div
            key="documents"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredFiles.map((file) => {
              const dicom = isDicomFile(file);
              const FileIcon = getFileIcon(file);
              const categoryColors = getCategoryColor(file.category);

              return (
                <motion.div key={file.id} variants={itemVariants}>
                  <Card className={`group h-full border-0 shadow-md hover:shadow-xl rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${dicom ? 'ring-1 ring-blue-200' : ''}`}>
                    <CardContent className="p-0">
                      {/* Card Header */}
                      <div className={`p-4 ${dicom ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-gray-700 to-gray-800'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-lg ${dicom ? 'bg-white/20' : 'bg-white/10'}`}>
                            <FileIcon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white text-sm leading-tight truncate" title={file.fileName}>
                              {file.fileName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge className={`text-xs ${categoryColors.bg} ${categoryColors.text} ${categoryColors.border} border`}>
                                {formatCategory(file.category)}
                              </Badge>
                              {dicom && (
                                <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300 border">
                                  DICOM
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3 bg-white">
                        {file.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{file.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(file.uploadedAt)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <HardDrive className="h-3.5 w-3.5" />
                            <span>{formatFileSize(file.fileSize)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="px-4 pb-4 bg-white">
                        <div className="flex gap-2">
                          {dicom ? (
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md"
                              onClick={() => {
                                if (file.presignedUrl) {
                                  const viewerUrl = `/doctor/dashboard/dicom-view?url=${encodeURIComponent(file.presignedUrl)}&name=${encodeURIComponent(file.fileName)}`;
                                  window.open(viewerUrl, '_blank');
                                }
                              }}
                            >
                              <Scan className="h-3.5 w-3.5 mr-1.5" />
                              Open Viewer
                              <ExternalLink className="h-3 w-3 ml-1.5" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-md"
                                onClick={() => {
                                  if (file.presignedUrl) {
                                    window.open(file.presignedUrl, '_blank');
                                  }
                                }}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1.5" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-200 hover:bg-gray-50"
                                onClick={() => {
                                  if (file.presignedUrl) {
                                    const link = document.createElement('a');
                                    link.href = file.presignedUrl;
                                    link.download = file.fileName;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }
                                }}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
