"use client";

/**
 * Medical Imaging Page
 * Professional DICOM viewer for doctors
 */

import './dicom-viewer.css';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DicomUploadZone } from '@/components/dicom/DicomUploadZone';
import { DicomViewer } from '@/components/dicom/DicomViewer';
import { MeasurementToolsPanel } from '@/components/dicom/MeasurementToolsPanel';
import { DicomMetadataPanel } from '@/components/dicom/DicomMetadataPanel';
import { 
  loadDicomFile, 
  extractDicomMetadata 
} from '@/lib/dicom/dicom-utils';
import { DicomFile, DicomMetadata, ToolType } from '@/types/dicom';
import { 
  Scan, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  FileText,
  Grid3x3,
  List
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function MedicalImagingPage() {
  const [dicomFiles, setDicomFiles] = useState<DicomFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType>('WindowLevel');
  const [currentMetadata, setCurrentMetadata] = useState<DicomMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [measurementCount, setMeasurementCount] = useState(0);
  const [clearMeasurementsTrigger, setClearMeasurementsTrigger] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsLoading(true);
    const loadedFiles: DicomFile[] = [];

    try {
      for (const file of files) {
        toast.info(`Loading ${file.name}...`);
        
        try {
          const imageId = await loadDicomFile(file);
          const metadata = await extractDicomMetadata(file);
          
          loadedFiles.push({
            id: crypto.randomUUID(),
            file,
            imageId,
            metadata,
            isLoaded: true,
          });

          toast.success(`Loaded ${file.name}`);
        } catch (error) {
          console.error('Failed to load file:', file.name, error);
          toast.error(`Failed to load ${file.name}`);
          
          loadedFiles.push({
            id: crypto.randomUUID(),
            file,
            isLoaded: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      setDicomFiles(loadedFiles);
      if (loadedFiles.length > 0 && loadedFiles[0].isLoaded) {
        setCurrentFileIndex(0);
        setCurrentMetadata(loadedFiles[0].metadata || null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePreviousFile = useCallback(() => {
    if (currentFileIndex > 0) {
      const newIndex = currentFileIndex - 1;
      setCurrentFileIndex(newIndex);
      setCurrentMetadata(dicomFiles[newIndex].metadata || null);
    }
  }, [currentFileIndex, dicomFiles]);

  const handleNextFile = useCallback(() => {
    if (currentFileIndex < dicomFiles.length - 1) {
      const newIndex = currentFileIndex + 1;
      setCurrentFileIndex(newIndex);
      setCurrentMetadata(dicomFiles[newIndex].metadata || null);
    }
  }, [currentFileIndex, dicomFiles]);

  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
  }, []);

  const handleClearMeasurements = useCallback(() => {
    setClearMeasurementsTrigger(prev => prev + 1);
    toast.success('Measurements cleared');
  }, []);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePreviousFile();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextFile();
          break;
        case 'g':
        case 'G':
          if (dicomFiles.length > 1) {
            setShowImageGallery(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dicomFiles.length, handlePreviousFile, handleNextFile]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Scan className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100">
                  Medical Imaging Viewer
                </h1>
                <p className="text-sm text-slate-400">
                  Professional DICOM Image Analysis
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLeftPanel(!showLeftPanel)}
                className="bg-slate-800 border-slate-700 text-slate-300"
              >
                {showLeftPanel ? 'Hide' : 'Show'} Tools
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRightPanel(!showRightPanel)}
                className="bg-slate-800 border-slate-700 text-slate-300"
              >
                {showRightPanel ? 'Hide' : 'Show'} Info
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {dicomFiles.length === 0 ? (
          /* Welcome Screen */
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-900 border-slate-800 p-8">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="p-6 bg-blue-600/10 rounded-full">
                    <Scan className="w-16 h-16 text-blue-400" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-slate-100">
                    Welcome to Medical Imaging Viewer
                  </h2>
                  <p className="text-lg text-slate-400">
                    Upload DICOM files to begin analyzing medical images
                  </p>
                </div>

                <Separator className="bg-slate-800" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-600/10 rounded-lg w-fit">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-slate-200">
                      DICOM Support
                    </h3>
                    <p className="text-sm text-slate-400">
                      Full support for CT, MRI, X-Ray, and other DICOM modalities
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 bg-blue-600/10 rounded-lg w-fit">
                      <Scan className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-slate-200">
                      Measurement Tools
                    </h3>
                    <p className="text-sm text-slate-400">
                      Precise measurements with length, angle, and ROI tools
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 bg-blue-600/10 rounded-lg w-fit">
                      <Info className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-slate-200">
                      Metadata Analysis
                    </h3>
                    <p className="text-sm text-slate-400">
                      Complete DICOM tag information and study details
                    </p>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                <div className="max-w-2xl mx-auto">
                  <DicomUploadZone
                    onFilesSelected={handleFilesSelected}
                    maxFiles={20}
                    disabled={isLoading}
                  />
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>
                    Supported formats: .dcm, .dicom
                  </p>
                  <p>
                    All files are processed locally in your browser for maximum privacy
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          /* Viewer Layout */
          <div className="grid grid-cols-12 gap-4">
            {/* Left Panel - Tools */}
            {showLeftPanel && (
              <div className="col-span-12 lg:col-span-3 space-y-4">
                <MeasurementToolsPanel
                  activeTool={activeTool}
                  onToolChange={handleToolChange}
                  onClearMeasurements={handleClearMeasurements}
                  measurementCount={measurementCount}
                />

                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <h4 className="text-sm font-semibold text-slate-200 mb-3">
                    Loaded Files
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {dicomFiles.map((file, index) => (
                      <Button
                        key={file.id}
                        variant={index === currentFileIndex ? 'default' : 'ghost'}
                        size="sm"
                        className={`
                          w-full justify-start text-left
                          ${index === currentFileIndex 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'text-slate-300 hover:bg-slate-700'
                          }
                        `}
                        onClick={() => {
                          setCurrentFileIndex(index);
                          setCurrentMetadata(file.metadata || null);
                        }}
                      >
                        <div className="truncate">
                          {file.file.name}
                        </div>
                      </Button>
                    ))}
                  </div>

                  <Separator className="my-3 bg-slate-700" />

                  <DicomUploadZone
                    onFilesSelected={handleFilesSelected}
                    maxFiles={20}
                    disabled={isLoading}
                  />
                </Card>
              </div>
            )}

            {/* Center Panel - Viewer */}
            <div className={`col-span-12 ${showLeftPanel && showRightPanel ? 'lg:col-span-6' : showLeftPanel || showRightPanel ? 'lg:col-span-9' : 'lg:col-span-12'}`}>
              <DicomViewer
                files={dicomFiles}
                currentFileIndex={currentFileIndex}
                onFileChange={setCurrentFileIndex}
                activeTool={activeTool}
                onMetadataExtracted={setCurrentMetadata}
                onMeasurementsChange={setMeasurementCount}
                clearMeasurementsTrigger={clearMeasurementsTrigger}
              />

              {/* Navigation Controls */}
              {dicomFiles.length > 1 && (
                <>
                  <Card className="bg-slate-800/50 border-slate-700 p-3 mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousFile}
                        disabled={currentFileIndex === 0}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-300 font-medium">
                          {currentFileIndex + 1} / {dicomFiles.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowImageGallery(!showImageGallery)}
                          className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                          title={showImageGallery ? "Hide Gallery" : "Show Gallery"}
                        >
                          {showImageGallery ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextFile}
                        disabled={currentFileIndex === dicomFiles.length - 1}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </Card>

                  {/* Image Gallery */}
                  {showImageGallery && (
                    <Card className="bg-slate-800/50 border-slate-700 p-4 mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-200">
                            All Images ({dicomFiles.length})
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowImageGallery(false)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            Close
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto">
                          {dicomFiles.map((file, index) => (
                            <button
                              key={file.id}
                              onClick={() => {
                                setCurrentFileIndex(index);
                                setCurrentMetadata(file.metadata || null);
                                setShowImageGallery(false);
                              }}
                              className={`
                                relative aspect-square rounded-lg border-2 transition-all
                                ${index === currentFileIndex
                                  ? 'border-blue-500 bg-blue-900/20 ring-2 ring-blue-500/50'
                                  : 'border-slate-600 bg-slate-700 hover:border-slate-500 hover:bg-slate-600'
                                }
                              `}
                            >
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                                <FileText className={`w-8 h-8 mb-1 ${index === currentFileIndex ? 'text-blue-400' : 'text-slate-400'}`} />
                                <span className={`text-xs font-medium truncate w-full text-center ${index === currentFileIndex ? 'text-blue-300' : 'text-slate-300'}`}>
                                  #{index + 1}
                                </span>
                                <span className="text-xs text-slate-500 truncate w-full text-center">
                                  {file.file.name.substring(0, 10)}...
                                </span>
                              </div>
                              {index === currentFileIndex && (
                                <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </button>
                          ))}
                        </div>

                        <div className="text-xs text-slate-400 text-center pt-2 border-t border-slate-700 space-y-1">
                          <div>Click any image to view</div>
                          <div className="flex items-center justify-center gap-4 flex-wrap">
                            <span><kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">←</kbd> Previous</span>
                            <span><kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">→</kbd> Next</span>
                            <span><kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">G</kbd> Toggle Gallery</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </div>

            {/* Right Panel - Metadata */}
            {showRightPanel && (
              <div className="col-span-12 lg:col-span-3">
                <DicomMetadataPanel metadata={currentMetadata} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

