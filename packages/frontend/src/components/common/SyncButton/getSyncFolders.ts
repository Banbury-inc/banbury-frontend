import banbury from '@banbury/core';

export const getSyncFolders = async () => {
  try {
    const device_name = banbury.device.name();
    const result = await banbury.device.getSingleDeviceInfoWithDeviceName(device_name);
    const device = result;
    console.log(device);
    // Check if device is not found
    if (!device) {
      return {
        syncingFiles: [],
        recentlyChanged: [],
        error: 'Device not found'
      };
    }

    const scannedFolders = device.scanned_folders || [];
    const scanProgress = device.scan_progress || {};
    const syncingFiles = scannedFolders.map((folder: any) => ({
      filename: folder,
      progress: scanProgress[folder] || 100,
      speed: scanProgress[folder] < 100 ? 'Scanning...' : 'Synced'
    }));

    return {
      syncingFiles,
      recentlyChanged: []
    };
  } catch (error) {
    return {
      syncingFiles: [],
      recentlyChanged: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
};
