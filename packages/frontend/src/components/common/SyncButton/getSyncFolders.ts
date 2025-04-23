import banbury from '@banbury/core';

export const getSyncFolders = async (devices: any[], username: string) => {
    try {
        console.log('Devices array:', devices);
        
        const deviceId = await banbury.device.get_device_id(username || 'default');
        console.log('Device ID:', deviceId);

        const device = devices.find((device) => device._id === deviceId);
        console.log('Found device:', device);
        
        // Check if device is not found
        if (!device) {
            console.log('Device not found, returning error');
            return {
                syncingFiles: [],
                recentlyChanged: [],
                error: 'Device not found'
            };
        }

        const scannedFolders = device.scanned_folders || [];

        console.log('scannedFolders', scannedFolders);

        const scanProgress = device.scan_progress || {};
        console.log('scanProgress', scanProgress);

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
