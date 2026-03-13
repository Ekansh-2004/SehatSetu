"use client";

/**
 * DICOM File Upload Zone
 * Drag-and-drop interface for uploading DICOM files
 */

import { useCallback, useState } from 'react';
import { Upload, FileIcon, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isDicomFile } from '@/lib/dicom/dicom-utils';

interface DicomUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export function DicomUploadZone({
  onFilesSelected,
  maxFiles = 10,
  disabled = false,
}: DicomUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);
      
      // Validate DICOM files
      const dicomFiles = fileArray.filter((file) => {
        if (!isDicomFile(file)) {
          setError(`${file.name} is not a valid DICOM file`);
          return false;
        }
        return true;
      });

      if (dicomFiles.length === 0) {
        setError('No valid DICOM files selected');
        return;
      }

      if (dicomFiles.length + selectedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const newFiles = [...selectedFiles, ...dicomFiles];
      setSelectedFiles(newFiles);
      onFilesSelected(newFiles);
    },
    [selectedFiles, maxFiles, onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(newFiles);
      onFilesSelected(newFiles);
    },
    [selectedFiles, onFilesSelected]
  );

  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    setError(null);
    onFilesSelected([]);
  }, [onFilesSelected]);

  return (
    <div className="space-y-4">
      <Card
        className={`
          border-2 border-dashed transition-all duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-slate-600 bg-slate-800/50 hover:bg-slate-800/70'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className="block p-8 text-center cursor-pointer">
          <input
            type="file"
            multiple
            accept=".dcm,.dicom,application/dicom"
            onChange={handleFileInput}
            disabled={disabled}
            className="hidden"
          />
          
          <div className="flex flex-col items-center space-y-4">
            <div className={`
              p-4 rounded-full transition-colors
              ${isDragging ? 'bg-blue-500/20' : 'bg-slate-700'}
            `}>
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium text-slate-200">
                {isDragging ? 'Drop DICOM files here' : 'Upload DICOM Files'}
              </p>
              <p className="text-sm text-slate-400">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-slate-500">
                Supports .dcm and .dicom files • Max {maxFiles} files
              </p>
            </div>
          </div>
        </label>
      </Card>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-200">
                Selected Files ({selectedFiles.length})
              </h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearAll}
                className="text-slate-400 hover:text-slate-200"
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    className="text-slate-400 hover:text-red-400 ml-2"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}






