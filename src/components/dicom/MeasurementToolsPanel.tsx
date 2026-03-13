"use client";

/**
 * Measurement Tools Panel
 * Tools for measuring distances, angles, and ROIs in DICOM images
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Ruler, 
  Triangle, 
  Square, 
  Circle, 
  Move, 
  ZoomIn, 
  Contrast,
  Trash2
} from 'lucide-react';
import { ToolType } from '@/types/dicom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MeasurementToolsPanelProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onClearMeasurements?: () => void;
  measurementCount?: number;
  className?: string;
}

export function MeasurementToolsPanel({
  activeTool,
  onToolChange,
  onClearMeasurements,
  measurementCount = 0,
  className = '',
}: MeasurementToolsPanelProps) {
  const tools = [
    { 
      name: 'Pan', 
      icon: Move, 
      tooltip: 'Pan - Click and drag to move image',
      description: 'Move image'
    },
    { 
      name: 'Zoom', 
      icon: ZoomIn, 
      tooltip: 'Zoom - Click and drag to zoom',
      description: 'Zoom in/out'
    },
    { 
      name: 'WindowLevel', 
      icon: Contrast, 
      tooltip: 'Window/Level - Adjust brightness and contrast',
      description: 'Adjust W/L'
    },
    { 
      name: 'Length', 
      icon: Ruler, 
      tooltip: 'Length - Measure distances',
      description: 'Measure length'
    },
  ] as const;

  return (
    <Card className={`bg-slate-800/50 border-slate-700 p-4 ${className}`}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-1">
            Measurement Tools
          </h3>
          <p className="text-xs text-slate-400">
            Select a tool to interact with the image
          </p>
        </div>

        <Separator className="bg-slate-700" />

        <TooltipProvider delayDuration={200}>
          <div className="space-y-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.name;
              
              return (
                <Tooltip key={tool.name}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      className={`
                        w-full justify-start space-x-3 h-auto py-3
                        ${isActive 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700'
                        }
                      `}
                      onClick={() => onToolChange(tool.name as ToolType)}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{tool.name}</div>
                        <div className="text-xs opacity-70">{tool.description}</div>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-slate-900 border-slate-700">
                    <p className="text-xs">{tool.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {measurementCount > 0 && (
          <>
            <Separator className="bg-slate-700" />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Measurements:</span>
                <span className="text-slate-200 font-semibold">{measurementCount}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full border-slate-600 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400"
                onClick={onClearMeasurements}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Measurements
              </Button>
            </div>
          </>
        )}

      </div>
    </Card>
  );
}

