"use client";

/**
 * Core DICOM Viewer Component  
 * Legacy Cornerstone.js for stable medical image viewing
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  RotateCw, 
  FlipVertical, 
  RefreshCw,
  Loader2,
  Maximize2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { initializeCornerstone } from '@/lib/dicom/cornerstone-init';
import { DicomFile, WindowLevelPreset } from '@/types/dicom';
import { WINDOW_LEVEL_PRESETS } from '@/lib/dicom/dicom-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Import cornerstone dynamically to avoid SSR issues
let cornerstone: any;
let cornerstoneTools: any;

interface DicomViewerProps {
  files: DicomFile[];
  currentFileIndex: number;
  onFileChange: (index: number) => void;
  activeTool: string;
  onMetadataExtracted?: (metadata: any) => void;
  onMeasurementsChange?: (count: number) => void;
  clearMeasurementsTrigger?: number;
}

export function DicomViewer({
  files,
  currentFileIndex,
  onFileChange,
  activeTool,
  onMetadataExtracted,
  onMeasurementsChange,
  clearMeasurementsTrigger,
}: DicomViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(400);
  const [windowCenter, setWindowCenter] = useState(40);
  const [rotation, setRotation] = useState(0);
  const [isInverted, setIsInverted] = useState(false);
  
  // Custom tool interaction state (for cursor visual feedback)
  const [isDragging, setIsDragging] = useState(false);
  
  // Track viewport changes to re-render measurements
  const [viewportVersion, setViewportVersion] = useState(0);
  
  // Measurement state (stored in IMAGE coordinates, not screen coordinates)
  interface Measurement {
    id: string;
    start: { x: number; y: number };  // Image coordinates
    end: { x: number; y: number };    // Image coordinates
    distance: number;
    unit: string;
  }
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activeMeasurement, setActiveMeasurement] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);

  // Notify parent of measurement count changes
  useEffect(() => {
    if (onMeasurementsChange) {
      onMeasurementsChange(measurements.length);
    }
  }, [measurements.length, onMeasurementsChange]);

  const currentFile = files[currentFileIndex];

  // Initialize Cornerstone
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Import cornerstone libraries
        cornerstone = (await import('cornerstone-core')).default;
        cornerstoneTools = (await import('cornerstone-tools')).default;
        
        await initializeCornerstone();
        
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('[DicomViewer] Initialization failed:', err);
        if (mounted) {
          setError('Failed to initialize viewer');
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Enable viewport
  useEffect(() => {
    if (!isInitialized || !viewportRef.current || !cornerstone) return;

    const element = viewportRef.current;

    try {
      // Enable the element for cornerstone (without tools for now)
      cornerstone.enable(element);
      console.log('[DicomViewer] Viewport enabled');
    } catch (err) {
      console.error('[DicomViewer] Failed to enable viewport:', err);
      // Try to continue anyway - the image might still render
    }

    return () => {
      if (element && cornerstone) {
        try {
          cornerstone.disable(element);
        } catch (err) {
          // Ignore disable errors
        }
      }
    };
  }, [isInitialized]);

  // Clear measurements when changing files
  useEffect(() => {
    setMeasurements([]);
    setActiveMeasurement(null);
  }, [currentFileIndex]);

  // Clear measurements when parent triggers it
  useEffect(() => {
    if (clearMeasurementsTrigger && clearMeasurementsTrigger > 0) {
      setMeasurements([]);
      setActiveMeasurement(null);
      console.log('[DicomViewer] Measurements cleared via trigger');
    }
  }, [clearMeasurementsTrigger]);

  // Load DICOM image
  useEffect(() => {
    if (!isInitialized || !viewportRef.current || !currentFile?.imageId || !cornerstone) return;

    const element = viewportRef.current;

    const loadImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('[DicomViewer] Loading image:', currentFile.imageId);
        const image = await cornerstone.loadAndCacheImage(currentFile.imageId);
        console.log('[DicomViewer] Image loaded, dimensions:', image.width, 'x', image.height);
        
        if (!element) return;

        // Display the image with proper viewport settings
        cornerstone.displayImage(element, image);
        console.log('[DicomViewer] Image displayed');
        
        // Get the default viewport and adjust for quality
        const viewport = cornerstone.getDefaultViewportForImage(element, image);
        
        // Preserve aspect ratio and ensure pixel-perfect rendering
        viewport.scale = 1.0; // Start at 1:1 pixel ratio
        
        // Apply the viewport
        cornerstone.setViewport(element, viewport);
        
        // Small delay to ensure DOM updates
        setTimeout(() => {
          if (!element) return;
          
          try {
            // Force resize to ensure canvas matches container
            cornerstone.resize(element, true);
            console.log('[DicomViewer] Resized');

            // Fit to window while preserving quality
            cornerstone.fitToWindow(element);
            console.log('[DicomViewer] Fit to window');
            
            // Check canvas exists and force it to be visible
            const canvas = element.querySelector('canvas');
            if (canvas) {
              console.log('[DicomViewer] Canvas found:', canvas.width, 'x', canvas.height);
              console.log('[DicomViewer] Canvas style BEFORE:', canvas.style.cssText);
              
              // Force canvas to be visible with inline styles
              canvas.style.position = 'absolute';
              canvas.style.top = '0';
              canvas.style.left = '0';
              canvas.style.width = '100%';
              canvas.style.height = '100%';
              canvas.style.display = 'block';
              canvas.style.zIndex = '1';
              canvas.style.objectFit = 'contain';
              canvas.style.imageRendering = 'high-quality';
              // Disable canvas smoothing for sharper medical images
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.imageSmoothingEnabled = false;
              }
              
              console.log('[DicomViewer] Canvas style AFTER:', canvas.style.cssText);
            } else {
              console.error('[DicomViewer] Canvas NOT found in element!');
            }

            // Set initial window/level from image
            const viewport = cornerstone.getViewport(element);
            if (viewport && viewport.voi) {
              setWindowWidth(viewport.voi.windowWidth);
              setWindowCenter(viewport.voi.windowCenter);
              console.log('[DicomViewer] Window/Level set:', viewport.voi);
            }
            
            // Force a render update to ensure pixels are drawn
            cornerstone.updateImage(element);
            console.log('[DicomViewer] Forced render update');
          } catch (err) {
            console.error('[DicomViewer] Post-display error:', err);
          }
        }, 100);

        // Report metadata
        if (onMetadataExtracted && currentFile.metadata) {
          onMetadataExtracted(currentFile.metadata);
        }

        console.log('[DicomViewer] Image loaded successfully');
      } catch (err: any) {
        console.error('[DicomViewer] Failed to load image:', err);
        setError(err.message || 'Failed to load DICOM image');
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [isInitialized, currentFile, onMetadataExtracted]);

  // Custom tool mouse handlers (no external tools library needed)
  useEffect(() => {
    const element = viewportRef.current;
    if (!element || !cornerstone || !isInitialized) return;

    let isCurrentlyDragging = false;
    let dragStart: { x: number; y: number; viewport: any } | null = null;
    let measurementStart: { x: number; y: number } | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;
      
      e.preventDefault();

      // Handle Length tool differently - it's for creating measurements, not dragging
      if (activeTool === 'Length') {
        // Convert page coordinates to image coordinates
        // pageToPixel expects page X/Y (pageX/pageY)
        try {
          const imagePoint = cornerstone.pageToPixel(element, e.pageX, e.pageY);
          measurementStart = { x: imagePoint.x, y: imagePoint.y };
          setActiveMeasurement({
            start: { x: imagePoint.x, y: imagePoint.y },
            current: { x: imagePoint.x, y: imagePoint.y }
          });
          console.log('[DicomViewer] Length measurement started:',
            'page:', e.pageX, e.pageY,
            'image:', imagePoint.x, imagePoint.y);
        } catch (err) {
          console.error('[DicomViewer] Failed to convert to image coordinates:', err);
        }
        return;
      }

      // For other tools, handle as drag
      isCurrentlyDragging = true;
      setIsDragging(true);

      try {
        const viewport = cornerstone.getViewport(element);
        
        // Ensure translation object exists with default values
        if (!viewport.translation) {
          viewport.translation = { x: 0, y: 0 };
        }
        
        dragStart = {
          x: e.clientX,
          y: e.clientY,
          viewport: JSON.parse(JSON.stringify(viewport)) // Deep copy to avoid reference issues
        };
        console.log('[DicomViewer] Mouse down, tool:', activeTool, 'translation:', viewport.translation);
      } catch (err) {
        console.error('[DicomViewer] Failed to get viewport on mousedown:', err);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Handle Length tool preview
      if (activeTool === 'Length' && measurementStart) {
        // Convert page coordinates to image coordinates
        try {
          const imagePoint = cornerstone.pageToPixel(element, e.pageX, e.pageY);
          setActiveMeasurement({
            start: measurementStart,
            current: { x: imagePoint.x, y: imagePoint.y }
          });
        } catch (err) {
          // Ignore conversion errors during drag
        }
        return;
      }

      if (!isCurrentlyDragging || !dragStart) return;

      e.preventDefault();

      try {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const viewport = cornerstone.getViewport(element);

        if (!viewport) return;

        // Apply tool-specific transformations
        switch (activeTool) {
          case 'Pan': {
            // Pan: translate the image
            const scale = viewport.scale || 1;
            
            // Ensure translation exists
            if (!viewport.translation) {
              viewport.translation = { x: 0, y: 0 };
            }
            if (!dragStart.viewport.translation) {
              dragStart.viewport.translation = { x: 0, y: 0 };
            }
            
            // Calculate new translation with better sensitivity
            const sensitivity = 1.0; // Adjust this if needed (lower = less sensitive)
            const newX = dragStart.viewport.translation.x + (deltaX * sensitivity);
            const newY = dragStart.viewport.translation.y + (deltaY * sensitivity);
            
            // Add limits to prevent image from going too far (allow some movement but not infinite)
            const maxTranslation = 2000; // Maximum pixels away from center
            viewport.translation.x = Math.max(-maxTranslation, Math.min(maxTranslation, newX));
            viewport.translation.y = Math.max(-maxTranslation, Math.min(maxTranslation, newY));
            
            break;
          }

          case 'Zoom': {
            // Zoom: scale based on vertical movement
            const zoomSpeed = 0.01;
            const scaleDelta = 1 + (deltaY * zoomSpeed);
            viewport.scale = Math.max(0.1, Math.min(10, dragStart.viewport.scale * scaleDelta));
            break;
          }

          case 'WindowLevel': {
            // Window/Level: adjust brightness and contrast
            const wwSpeed = 2;
            const wcSpeed = 2;
            const newWW = Math.max(1, dragStart.viewport.voi.windowWidth + (deltaX * wwSpeed));
            const newWC = dragStart.viewport.voi.windowCenter + (deltaY * wcSpeed);
            
            viewport.voi.windowWidth = newWW;
            viewport.voi.windowCenter = newWC;
            
            setWindowWidth(newWW);
            setWindowCenter(newWC);
            break;
          }

          case 'Length':
            // Length tool is handled separately in mousedown/move/up
            break;
        }

        cornerstone.setViewport(element, viewport);
        setViewportVersion(prev => prev + 1); // Trigger measurement re-render
      } catch (err) {
        console.error('[DicomViewer] Tool interaction error:', err);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      console.log('[DicomViewer] Mouse up, tool:', activeTool);
      
      // Handle Length tool completion
      if (activeTool === 'Length' && measurementStart) {
        // Convert page coordinates to image coordinates
        let imagePoint;
        try {
          imagePoint = cornerstone.pageToPixel(element, e.pageX, e.pageY);
        } catch (err) {
          console.error('[DicomViewer] Failed to convert end point:', err);
          measurementStart = null;
          setActiveMeasurement(null);
          return;
        }
        
        // Calculate distance in IMAGE pixels
        const dx = imagePoint.x - measurementStart.x;
        const dy = imagePoint.y - measurementStart.y;
        const distancePixels = Math.sqrt(dx * dx + dy * dy);
        
        console.log('[DicomViewer] Length tool - distance pixels:', distancePixels);
        
        // Only add measurement if line has some length (not just a click)
        if (distancePixels > 5) {
          // Get pixel spacing from metadata if available
          let distanceMM = distancePixels;
          let unit = 'px';
          
          if (currentFile?.metadata?.pixelSpacing && currentFile.metadata.pixelSpacing.length >= 2) {
            const rowSpacing = currentFile.metadata.pixelSpacing[0];
            const colSpacing = currentFile.metadata.pixelSpacing[1];
            // Average spacing for diagonal measurements
            const avgSpacing = (rowSpacing + colSpacing) / 2;
            distanceMM = distancePixels * avgSpacing;
            unit = 'mm';
            console.log('[DicomViewer] Using pixel spacing:', avgSpacing, 'mm/px');
          }
          
          const newMeasurement: Measurement = {
            id: Date.now().toString(),
            start: measurementStart,
            end: { x: imagePoint.x, y: imagePoint.y },
            distance: distanceMM,
            unit: unit
          };
          
          setMeasurements(prev => [...prev, newMeasurement]);
          console.log('[DicomViewer] Measurement added:', distanceMM.toFixed(2), unit);
        } else {
          console.log('[DicomViewer] Measurement too short, not adding');
        }
        
        measurementStart = null;
        setActiveMeasurement(null);
        return;
      }
      
      isCurrentlyDragging = false;
      dragStart = null;
      setIsDragging(false);
    };

    const handleMouseLeave = () => {
      console.log('[DicomViewer] Mouse leave');
      isCurrentlyDragging = false;
      dragStart = null;
      measurementStart = null;
      setIsDragging(false);
      setActiveMeasurement(null);
    };

    // Add event listeners
    element.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseLeave);

    console.log('[DicomViewer] Tool event listeners attached for:', activeTool);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isInitialized, activeTool]);

  // Mouse wheel for zoom
  useEffect(() => {
    const element = viewportRef.current;
    if (!element || !cornerstone || !isInitialized) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      try {
        const viewport = cornerstone.getViewport(element);
        if (!viewport) return;

        // Zoom with mouse wheel
        const zoomSpeed = 0.001;
        const scaleDelta = 1 - (e.deltaY * zoomSpeed);
        viewport.scale = Math.max(0.1, Math.min(10, viewport.scale * scaleDelta));

        cornerstone.setViewport(element, viewport);
        setViewportVersion(prev => prev + 1); // Trigger measurement re-render
      } catch (err) {
        console.error('[DicomViewer] Wheel zoom error:', err);
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [isInitialized]);

  // Get cursor style based on active tool
  const getCursorStyle = () => {
    if (isDragging) return 'grabbing';
    
    switch (activeTool) {
      case 'Pan': return 'grab';
      case 'Zoom': return 'zoom-in';
      case 'WindowLevel': return 'ns-resize';
      case 'Length': return 'crosshair';
      default: return 'default';
    }
  };

  // Apply window/level
  const applyWindowLevel = useCallback((width: number, center: number) => {
    if (!viewportRef.current || !cornerstone) return;

    try {
      const viewport = cornerstone.getViewport(viewportRef.current);
      if (viewport) {
        viewport.voi.windowWidth = width;
        viewport.voi.windowCenter = center;
        cornerstone.setViewport(viewportRef.current, viewport);
        setViewportVersion(prev => prev + 1); // Trigger measurement re-render
      }
      setWindowWidth(width);
      setWindowCenter(center);
    } catch (err) {
      console.error('[DicomViewer] Failed to apply window/level:', err);
    }
  }, []);

  // Apply preset
  const applyPreset = useCallback((preset: WindowLevelPreset) => {
    applyWindowLevel(preset.windowWidth, preset.windowCenter);
  }, [applyWindowLevel]);

  // Rotate image
  const rotate = useCallback(() => {
    if (!viewportRef.current || !cornerstone) return;

    try {
      const newRotation = (rotation + 90) % 360;
      const viewport = cornerstone.getViewport(viewportRef.current);
      if (viewport) {
        viewport.rotation = newRotation;
        cornerstone.setViewport(viewportRef.current, viewport);
        setViewportVersion(prev => prev + 1); // Trigger measurement re-render
      }
      setRotation(newRotation);
    } catch (err) {
      console.error('[DicomViewer] Failed to rotate:', err);
    }
  }, [rotation]);

  // Invert image
  const invertImage = useCallback(() => {
    if (!viewportRef.current || !cornerstone) return;

    try {
      const viewport = cornerstone.getViewport(viewportRef.current);
      if (viewport) {
        viewport.invert = !isInverted;
        cornerstone.setViewport(viewportRef.current, viewport);
        setViewportVersion(prev => prev + 1); // Trigger measurement re-render
      }
      setIsInverted(!isInverted);
    } catch (err) {
      console.error('[DicomViewer] Failed to invert:', err);
    }
  }, [isInverted]);

  // Clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setActiveMeasurement(null);
    console.log('[DicomViewer] All measurements cleared');
  }, []);

  // Reset viewport and center image
  const resetViewport = useCallback(() => {
    if (!viewportRef.current || !cornerstone) return;

    const element = viewportRef.current;

    try {
      // Clear measurements on reset
      clearMeasurements();
      
      // Reset to default viewport
      cornerstone.reset(element);
      
      // Ensure image is centered and fit to window
      setTimeout(() => {
        try {
          cornerstone.fitToWindow(element);
          
          const viewport = cornerstone.getViewport(element);
          if (viewport) {
            // Ensure translation is centered (0, 0)
            viewport.translation = { x: 0, y: 0 };
            viewport.scale = 1.0;
            cornerstone.setViewport(element, viewport);
            setViewportVersion(prev => prev + 1); // Trigger measurement re-render
            
            if (viewport.voi) {
              setWindowWidth(viewport.voi.windowWidth);
              setWindowCenter(viewport.voi.windowCenter);
            }
          }
          
          cornerstone.updateImage(element);
          console.log('[DicomViewer] Viewport reset and centered');
        } catch (err) {
          console.error('[DicomViewer] Failed to fit after reset:', err);
        }
      }, 50);
      
      setRotation(0);
      setIsInverted(false);
    } catch (err) {
      console.error('[DicomViewer] Failed to reset:', err);
    }
  }, [clearMeasurements]);

  if (!isInitialized) {
    return (
      <Card className="bg-slate-900 border-slate-700 p-8">
        <div className="flex flex-col items-center justify-center space-y-4 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Initializing DICOM viewer...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-900 border-slate-700 p-8">
        <div className="text-center space-y-2">
          <p className="text-red-400">{error}</p>
          <Button onClick={() => setError(null)} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pixel Spacing Warning */}
      {activeTool === 'Length' && (!currentFile?.metadata?.pixelSpacing || currentFile.metadata.pixelSpacing.length < 2) && (
        <Card className="bg-yellow-900/20 border-yellow-600/50 p-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-yellow-200">
                Measurements in Pixels (No Calibration)
              </p>
              <p className="text-xs text-yellow-300/80">
                This DICOM file is missing <strong>Pixel Spacing</strong> metadata. 
                Measurements will be in pixels, not real-world distances (mm/cm). 
                Real medical DICOM files from scanners include this calibration data.
                Check the Info panel (right side) to verify.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Toolbar */}
      <Card className="bg-slate-800/50 border-slate-700 p-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Select
              value={`${windowWidth}-${windowCenter}`}
              onValueChange={(value) => {
                const preset = WINDOW_LEVEL_PRESETS.find(
                  p => `${p.windowWidth}-${p.windowCenter}` === value
                );
                if (preset) applyPreset(preset);
              }}
            >
              <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600">
                <SelectValue placeholder="W/L Preset" />
              </SelectTrigger>
              <SelectContent>
                {WINDOW_LEVEL_PRESETS.map((preset) => (
                  <SelectItem 
                    key={preset.name} 
                    value={`${preset.windowWidth}-${preset.windowCenter}`}
                  >
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={rotate}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              <RotateCw className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={invertImage}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              <FlipVertical className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (viewportRef.current && cornerstone) {
                  try {
                    cornerstone.fitToWindow(viewportRef.current);
                    const viewport = cornerstone.getViewport(viewportRef.current);
                    if (viewport) {
                      viewport.translation = { x: 0, y: 0 };
                      cornerstone.setViewport(viewportRef.current, viewport);
                      setViewportVersion(prev => prev + 1); // Trigger measurement re-render
                    }
                    console.log('[DicomViewer] Fit to window');
                  } catch (err) {
                    console.error('[DicomViewer] Failed to fit:', err);
                  }
                }
              }}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
              title="Fit to Window"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={resetViewport}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
              title="Reset All"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            {measurements.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={clearMeasurements}
                className="bg-slate-700 border-slate-600 hover:bg-red-600"
                title={`Clear ${measurements.length} measurement${measurements.length > 1 ? 's' : ''}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-3 text-sm text-slate-300">
            <span>W: {Math.round(windowWidth)}</span>
            <span>L: {Math.round(windowCenter)}</span>
            {measurements.length > 0 && (
              <span className="text-green-400">📏 {measurements.length}</span>
            )}
            {files.length > 1 && (
              <span>Image {currentFileIndex + 1} of {files.length}</span>
            )}
          </div>
        </div>

        {/* Window/Level Sliders */}
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Window Width: {Math.round(windowWidth)}</label>
            <Slider
              value={[windowWidth]}
              onValueChange={([value]) => applyWindowLevel(value, windowCenter)}
              min={1}
              max={4000}
              step={1}
              className="cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Window Center: {Math.round(windowCenter)}</label>
            <Slider
              value={[windowCenter]}
              onValueChange={([value]) => applyWindowLevel(windowWidth, value)}
              min={-1024}
              max={3000}
              step={1}
              className="cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Viewport */}
      <Card className="bg-black border-slate-700">
        <div className="relative bg-black" style={{ height: '600px', width: '100%' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          )}
          
          <div
            ref={viewportRef}
            style={{ 
              height: '600px',
              width: '100%',
              backgroundColor: '#000',
              display: 'block',
              position: 'relative',
              cursor: getCursorStyle(),
              userSelect: 'none',
            }}
          >
            {/* Canvas will be injected here by Cornerstone */}
            
            {/* SVG overlay for measurements - re-renders on viewport changes */}
            <svg
              key={`measurements-${viewportVersion}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              {/* Draw completed measurements */}
              {cornerstone && measurements.map((measurement) => {
                try {
                  // Convert image coordinates to screen coordinates
                  const startCanvas = cornerstone.pixelToCanvas(viewportRef.current, measurement.start);
                  const endCanvas = cornerstone.pixelToCanvas(viewportRef.current, measurement.end);
                  
                  console.log('[DicomViewer] Rendering measurement:', 
                    'image:', measurement.start, measurement.end,
                    'screen:', startCanvas, endCanvas);
                  
                  return (
                    <g key={measurement.id}>
                      {/* Measurement line */}
                      <line
                        x1={startCanvas.x}
                        y1={startCanvas.y}
                        x2={endCanvas.x}
                        y2={endCanvas.y}
                        stroke="#00ff00"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      {/* Start point */}
                      <circle
                        cx={startCanvas.x}
                        cy={startCanvas.y}
                        r="4"
                        fill="#00ff00"
                      />
                      {/* End point */}
                      <circle
                        cx={endCanvas.x}
                        cy={endCanvas.y}
                        r="4"
                        fill="#00ff00"
                      />
                      {/* Distance label */}
                      <text
                        x={(startCanvas.x + endCanvas.x) / 2}
                        y={(startCanvas.y + endCanvas.y) / 2 - 10}
                        fill="#00ff00"
                        fontSize="14"
                        fontWeight="bold"
                        textAnchor="middle"
                        style={{ 
                          textShadow: '1px 1px 2px black, -1px -1px 2px black',
                          pointerEvents: 'none'
                        }}
                      >
                        {measurement.distance.toFixed(2)} {measurement.unit}
                      </text>
                    </g>
                  );
                } catch (err) {
                  console.error('[DicomViewer] Failed to render measurement:', err);
                  return null;
                }
              })}
              
              {/* Draw active measurement (preview) */}
              {cornerstone && activeMeasurement && (() => {
                try {
                  const startCanvas = cornerstone.pixelToCanvas(viewportRef.current, activeMeasurement.start);
                  const currentCanvas = cornerstone.pixelToCanvas(viewportRef.current, activeMeasurement.current);
                  
                  return (
                    <g>
                      <line
                        x1={startCanvas.x}
                        y1={startCanvas.y}
                        x2={currentCanvas.x}
                        y2={currentCanvas.y}
                        stroke="#ffff00"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        strokeLinecap="round"
                      />
                      <circle
                        cx={startCanvas.x}
                        cy={startCanvas.y}
                        r="4"
                        fill="#ffff00"
                      />
                      <circle
                        cx={currentCanvas.x}
                        cy={currentCanvas.y}
                        r="4"
                        fill="#ffff00"
                      />
                    </g>
                  );
                } catch (err) {
                  return null;
                }
              })()}
            </svg>
          </div>

          {/* Overlay Information */}
          {currentFile?.metadata && !isLoading && (
            <div className="absolute top-4 left-4 text-white text-sm space-y-1 font-mono bg-black/70 p-3 rounded pointer-events-none z-20">
              <div>{currentFile.metadata.patientName || 'Unknown Patient'}</div>
              <div>{currentFile.metadata.patientId || 'No ID'}</div>
              <div>{currentFile.metadata.studyDescription || 'No Description'}</div>
            </div>
          )}

          {/* Bottom Right Info */}
          {currentFile?.metadata && !isLoading && (
            <div className="absolute bottom-4 right-4 text-white text-xs font-mono bg-black/70 p-2 rounded pointer-events-none z-20">
              <div>{currentFile?.metadata?.modality || 'DICOM'}</div>
              {currentFile?.metadata?.rows && currentFile?.metadata?.columns && (
                <div>{currentFile.metadata.columns} × {currentFile.metadata.rows}</div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
