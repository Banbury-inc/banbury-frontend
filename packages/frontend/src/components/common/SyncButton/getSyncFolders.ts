import banbury from '@banbury/core';

export const getSyncFolders = async (devices: any[], username: string) => {
  try {

    const result = await banbury.device.get_device_id(username || 'default');
    const deviceId = result.message;
    const device = devices.find((device) => device._id === deviceId);
    // Check if device is not found
    if (!device) {
      return {
        syncingFiles: [],
        recentlyChanged: [],
        error: 'Device not found'
      };
    }

    const scannedFolders = device.scanned_folders || [];
    console.log(scannedFolders);
    const scanProgress = device.scan_progress || {};
    console.log(scanProgress);
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
