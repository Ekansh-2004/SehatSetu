"use client";

/**
 * DICOM Metadata Display Panel
 * Shows detailed DICOM tag information
 */

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DicomMetadata } from '@/types/dicom';
import { formatDicomDate, formatDicomTime, getModalityDisplayName } from '@/lib/dicom/dicom-utils';
import { User, Calendar, FileText, Image, Hospital } from 'lucide-react';

interface DicomMetadataPanelProps {
  metadata: DicomMetadata | null;
  className?: string;
}

export function DicomMetadataPanel({ metadata, className = '' }: DicomMetadataPanelProps) {
  if (!metadata) {
    return (
      <Card className={`bg-slate-800/50 border-slate-700 p-6 ${className}`}>
        <p className="text-sm text-slate-400 text-center">
          No DICOM file loaded
        </p>
      </Card>
    );
  }

  const MetadataSection = ({ 
    title, 
    icon: Icon, 
    items 
  }: { 
    title: string; 
    icon: any; 
    items: Array<{ label: string; value: string | undefined }> 
  }) => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Icon className="w-4 h-4 text-blue-400" />
        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      </div>
      <div className="space-y-2 ml-6">
        {items.map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-slate-400">{label}:</span>
            <span className="text-slate-200 font-mono text-xs">
              {value || 'N/A'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className={`bg-slate-800/50 border-slate-700 p-4 ${className}`}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            DICOM Metadata
          </h3>
        </div>

        <Separator className="bg-slate-700" />

        {/* Patient Information */}
        <MetadataSection
          title="Patient Information"
          icon={User}
          items={[
            { label: 'Name', value: metadata.patientName },
            { label: 'ID', value: metadata.patientId },
            { label: 'Birth Date', value: formatDicomDate(metadata.patientBirthDate) },
            { label: 'Sex', value: metadata.patientSex },
            { label: 'Age', value: metadata.patientAge },
          ]}
        />

        <Separator className="bg-slate-700" />

        {/* Study Information */}
        <MetadataSection
          title="Study Information"
          icon={FileText}
          items={[
            { label: 'Study Date', value: formatDicomDate(metadata.studyDate) },
            { label: 'Study Time', value: formatDicomTime(metadata.studyTime) },
            { label: 'Description', value: metadata.studyDescription },
            { label: 'Modality', value: getModalityDisplayName(metadata.modality) },
            { label: 'Accession No.', value: metadata.accessionNumber },
          ]}
        />

        <Separator className="bg-slate-700" />

        {/* Image Information */}
        <MetadataSection
          title="Image Information"
          icon={Image}
          items={[
            { 
              label: 'Dimensions', 
              value: metadata.rows && metadata.columns 
                ? `${metadata.columns} × ${metadata.rows}` 
                : undefined 
            },
            {
              label: 'Pixel Spacing',
              value: metadata.pixelSpacing
                ? `${metadata.pixelSpacing[0].toFixed(2)} × ${metadata.pixelSpacing[1].toFixed(2)} mm`
                : undefined,
            },
            {
              label: 'Slice Thickness',
              value: metadata.sliceThickness ? `${metadata.sliceThickness} mm` : undefined,
            },
            { label: 'Body Part', value: metadata.bodyPartExamined },
            { label: 'Instance No.', value: metadata.instanceNumber },
          ]}
        />

        <Separator className="bg-slate-700" />

        {/* Acquisition Information */}
        <MetadataSection
          title="Acquisition"
          icon={Hospital}
          items={[
            { label: 'Institution', value: metadata.institutionName },
            { label: 'Manufacturer', value: metadata.manufacturer },
            { label: 'Model', value: metadata.manufacturerModelName },
            { label: 'Acq. Date', value: formatDicomDate(metadata.acquisitionDate) },
          ]}
        />

        <Separator className="bg-slate-700" />

        {/* Technical Details */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-200">Technical</h4>
          <div className="space-y-2 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Bits Allocated:</span>
              <span>{metadata.bitsAllocated || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Samples/Pixel:</span>
              <span>{metadata.samplesPerPixel || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Photometric:</span>
              <span className="truncate ml-2 max-w-[150px]">
                {metadata.photometricInterpretation || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}






