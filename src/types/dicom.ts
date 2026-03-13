export interface DicomFile {
  id: string;
  file: File;
  imageId?: string;
  metadata?: DicomMetadata;
  isLoaded: boolean;
  error?: string;
}

export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  patientBirthDate?: string;
  patientSex?: string;
  patientAge?: string;
  studyInstanceUID?: string;
  studyDate?: string;
  studyTime?: string;
  studyDescription?: string;
  studyID?: string;
  accessionNumber?: string;
  seriesInstanceUID?: string;
  seriesNumber?: string;
  seriesDescription?: string;
  modality?: string;
  instanceNumber?: string;
  sopInstanceUID?: string;
  sopClassUID?: string;
  acquisitionDate?: string;
  acquisitionTime?: string;
  institutionName?: string;
  manufacturer?: string;
  manufacturerModelName?: string;
  rows?: number;
  columns?: number;
  sliceThickness?: number;
  sliceLocation?: number;
  windowCenter?: number;
  windowWidth?: number;
  bodyPartExamined?: string;
  photometricInterpretation?: string;
  bitsAllocated?: number;
  bitsStored?: number;
  samplesPerPixel?: number;
  pixelSpacing?: number[];
  [key: string]: any;
}

export type ToolType = 
  | 'WindowLevel'
  | 'Zoom'
  | 'Pan'
  | 'Length'
  | 'Angle'
  | 'RectangleROI'
  | 'EllipticalROI'
  | 'Magnify';

export interface WindowLevelPreset {
  name: string;
  windowWidth: number;
  windowCenter: number;
  description: string;
}

