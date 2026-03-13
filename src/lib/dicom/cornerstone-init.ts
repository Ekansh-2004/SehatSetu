/**
 * Cornerstone.js Initialization & Configuration
 * Medical imaging viewer setup for DICOM files
 */

// Use legacy cornerstone for simpler DICOM viewing
import cornerstone from 'cornerstone-core';
import cornerstoneMath from 'cornerstone-math';
import cornerstoneTools from 'cornerstone-tools';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

let isInitialized = false;

export async function initializeCornerstone() {
  if (isInitialized) {
    console.log('[Cornerstone] Already initialized');
    return;
  }

  try {
    console.log('[Cornerstone] Starting initialization...');

    // Configure WADO Image Loader
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

    // Configure web workers
    const config = {
      maxWebWorkers: Math.min(navigator.hardwareConcurrency || 1, 2),
      startWebWorkersOnDemand: true,
      taskConfiguration: {
        decodeTask: {
          initializeCodecsOnStartup: false,
          strict: false,
        },
      },
    };

    cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
    console.log('[Cornerstone] Web workers initialized');

    // Skip tools initialization for now to avoid pointer events error
    // cornerstoneTools.external.cornerstone = cornerstone;
    // cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
    // cornerstoneTools.init();
    console.log('[Cornerstone] Tools initialization skipped (basic viewing only)');

    isInitialized = true;
    console.log('[Cornerstone] ✓ Initialization complete');
  } catch (error) {
    console.error('[Cornerstone] Initialization error:', error);
    throw new Error(`Failed to initialize Cornerstone: ${error}`);
  }
}

export function getIsInitialized(): boolean {
  return isInitialized;
}

