/**
 * DICOM Utility Functions
 * Helper functions for DICOM file handling and metadata extraction
 */

import dicomParser from 'dicom-parser';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import { DicomMetadata, WindowLevelPreset } from '@/types/dicom';

/**
 * Load DICOM file from File object
 */
export async function loadDicomFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(blob);
    console.log('[DICOM] File loaded, imageId:', imageId);
    return imageId;
  } catch (error) {
    console.error('[DICOM] Failed to load file:', error);
    throw new Error(`Failed to load DICOM file: ${error}`);
  }
}

/**
 * Extract DICOM metadata from file
 */
export async function extractDicomMetadata(file: File): Promise<DicomMetadata> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);
    const dataSet = dicomParser.parseDicom(byteArray);

    const metadata: DicomMetadata = {
      // Patient Information
      patientName: dataSet.string('x00100010'),
      patientId: dataSet.string('x00100020'),
      patientBirthDate: dataSet.string('x00100030'),
      patientSex: dataSet.string('x00100040'),
      patientAge: dataSet.string('x00101010'),

      // Study Information
      studyInstanceUID: dataSet.string('x0020000d'),
      studyDate: dataSet.string('x00080020'),
      studyTime: dataSet.string('x00080030'),
      studyDescription: dataSet.string('x00081030'),
      studyID: dataSet.string('x00200010'),
      accessionNumber: dataSet.string('x00080050'),

      // Series Information
      seriesInstanceUID: dataSet.string('x0020000e'),
      seriesNumber: dataSet.string('x00200011'),
      seriesDescription: dataSet.string('x0008103e'),
      modality: dataSet.string('x00080060'),

      // Image Information
      instanceNumber: dataSet.string('x00200013'),
      sopInstanceUID: dataSet.string('x00080018'),
      sopClassUID: dataSet.string('x00080016'),

      // Acquisition Information
      acquisitionDate: dataSet.string('x00080022'),
      acquisitionTime: dataSet.string('x00080032'),
      institutionName: dataSet.string('x00080080'),
      manufacturer: dataSet.string('x00080070'),
      manufacturerModelName: dataSet.string('x00081090'),

      // Image Dimensions
      rows: dataSet.uint16('x00280010'),
      columns: dataSet.uint16('x00280011'),
      sliceThickness: dataSet.floatString('x00180050'),
      sliceLocation: dataSet.floatString('x00201041'),

      // Window/Level
      windowCenter: dataSet.floatString('x00281050') || undefined,
      windowWidth: dataSet.floatString('x00281051') || undefined,

      // Additional
      bodyPartExamined: dataSet.string('x00180015'),
      photometricInterpretation: dataSet.string('x00280004'),
      bitsAllocated: dataSet.uint16('x00280100'),
      bitsStored: dataSet.uint16('x00280101'),
      samplesPerPixel: dataSet.uint16('x00280002'),
    };

    // Parse pixel spacing
    const pixelSpacing = dataSet.string('x00280030');
    if (pixelSpacing) {
      const spacing = pixelSpacing.split('\\').map(Number);
      if (spacing.length === 2) {
        metadata.pixelSpacing = [spacing[0], spacing[1]];
      }
    }

    console.log('[DICOM] Metadata extracted:', metadata);
    return metadata;
  } catch (error) {
    console.error('[DICOM] Failed to extract metadata:', error);
    throw new Error(`Failed to extract DICOM metadata: ${error}`);
  }
}

/**
 * Format DICOM date (YYYYMMDD) to readable format
 */
export function formatDicomDate(dicomDate?: string): string {
  if (!dicomDate || dicomDate.length !== 8) return 'N/A';
  
  const year = dicomDate.substring(0, 4);
  const month = dicomDate.substring(4, 6);
  const day = dicomDate.substring(6, 8);
  
  return `${month}/${day}/${year}`;
}

/**
 * Format DICOM time (HHMMSS) to readable format
 */
export function formatDicomTime(dicomTime?: string): string {
  if (!dicomTime || dicomTime.length < 6) return 'N/A';
  
  const hours = dicomTime.substring(0, 2);
  const minutes = dicomTime.substring(2, 4);
  const seconds = dicomTime.substring(4, 6);
  
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Window/Level presets for different tissue types
 */
export const WINDOW_LEVEL_PRESETS: WindowLevelPreset[] = [
  {
    name: 'Soft Tissue',
    windowWidth: 400,
    windowCenter: 40,
    description: 'General soft tissue visualization',
  },
  {
    name: 'Lung',
    windowWidth: 1500,
    windowCenter: -600,
    description: 'Lung parenchyma',
  },
  {
    name: 'Bone',
    windowWidth: 1800,
    windowCenter: 400,
    description: 'Bone structures',
  },
  {
    name: 'Brain',
    windowWidth: 80,
    windowCenter: 40,
    description: 'Brain tissue',
  },
  {
    name: 'Liver',
    windowWidth: 150,
    windowCenter: 30,
    description: 'Liver tissue',
  },
  {
    name: 'Abdomen',
    windowWidth: 350,
    windowCenter: 50,
    description: 'Abdominal organs',
  },
  {
    name: 'Mediastinum',
    windowWidth: 350,
    windowCenter: 50,
    description: 'Mediastinal structures',
  },
];

/**
 * Get modality display name
 */
export function getModalityDisplayName(modality?: string): string {
  const modalityMap: Record<string, string> = {
    'CT': 'CT Scan',
    'MR': 'MRI',
    'CR': 'X-Ray (CR)',
    'DX': 'Digital X-Ray',
    'XA': 'X-Ray Angiography',
    'US': 'Ultrasound',
    'PT': 'PET Scan',
    'MG': 'Mammography',
    'NM': 'Nuclear Medicine',
    'OT': 'Other',
  };

  return modalityMap[modality || ''] || modality || 'Unknown';
}

/**
 * Validate if file is a DICOM file
 */
export function isDicomFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'dcm' || extension === 'dicom' || file.type === 'application/dicom';
}

