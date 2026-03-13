"use client";

/**
 * DICOM Viewer Page (URL-based)
 * View DICOM files from a presigned URL
 */

import '../medical-imaging/dicom-viewer.css';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Loader2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

function DicomViewContent() {
  const searchParams = useSearchParams();
  const fileUrl = searchParams?.get('url') ?? null;
  const fileName = searchParams?.get('name') || 'DICOM Image';

  const [dicomFiles, setDicomFiles] = useState<DicomFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType>('WindowLevel');
  const [currentMetadata, setCurrentMetadata] = useState<DicomMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [measurementCount, setMeasurementCount] = useState(0);
  const [clearMeasurementsTrigger, setClearMeasurementsTrigger] = useState(0);

  useEffect(() => {
    const loadFromUrl = async () => {
      if (!fileUrl) {
        setError('No DICOM file URL provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        toast.info(`Loading ${fileName}...`);

        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch DICOM file: ${response.statusText}`);
        }

        const blob = await response.blob();
        const file = new File([blob], fileName, { type: 'application/dicom' });

        const imageId = await loadDicomFile(file);
        const metadata = await extractDicomMetadata(file);

        const dicomFile: DicomFile = {
          id: crypto.randomUUID(),
          file,
          imageId,
          metadata,
          isLoaded: true,
        };

        setDicomFiles([dicomFile]);
        setCurrentMetadata(metadata);
        toast.success(`Loaded ${fileName}`);
      } catch (err) {
        console.error('Failed to load DICOM file:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load DICOM file';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromUrl();
  }, [fileUrl, fileName]);

  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
  }, []);

  const handleClearMeasurements = useCallback(() => {
    setClearMeasurementsTrigger(prev => prev + 1);
    toast.success('Measurements cleared');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="bg-slate-900 border-slate-800 p-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 text-blue-400 mx-auto animate-spin" />
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Loading DICOM Image</h2>
              <p className="text-sm text-slate-400 mt-1">{fileName}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="bg-slate-900 border-slate-800 p-8 max-w-md">
          <div className="text-center space-y-4">
            <div className="p-4 bg-red-600/10 rounded-full w-fit mx-auto">
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Failed to Load DICOM</h2>
              <p className="text-sm text-slate-400 mt-2">{error}</p>
            </div>
            <Link href="/doctor/dashboard/records">
              <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Records
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (dicomFiles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="bg-slate-900 border-slate-800 p-8 max-w-md">
          <div className="text-center space-y-4">
            <div className="p-4 bg-slate-800 rounded-full w-fit mx-auto">
              <Scan className="w-12 h-12 text-slate-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">No DICOM File</h2>
              <p className="text-sm text-slate-400 mt-2">No DICOM file URL was provided</p>
            </div>
            <Link href="/doctor/dashboard/records">
              <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Records
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/doctor/dashboard/records">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </Link>
              <div className="p-2 bg-blue-600 rounded-lg">
                <Scan className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 truncate max-w-[300px]">
                  {fileName}
                </h1>
                <p className="text-sm text-slate-400">
                  DICOM Image Viewer
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
          </div>

          {/* Right Panel - Metadata */}
          {showRightPanel && (
            <div className="col-span-12 lg:col-span-3">
              <DicomMetadataPanel metadata={currentMetadata} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DicomViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="bg-slate-900 border-slate-800 p-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 text-blue-400 mx-auto animate-spin" />
            <p className="text-slate-400">Loading viewer...</p>
          </div>
        </Card>
      </div>
    }>
      <DicomViewContent />
    </Suspense>
  );
}

