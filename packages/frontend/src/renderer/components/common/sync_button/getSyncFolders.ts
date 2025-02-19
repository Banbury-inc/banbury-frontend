import banbury from '@banbury/core';

export const getSyncFolders = async (devices: any[], username: string) => {
    try {
        if (!Array.isArray(devices)) {
            throw new Error('Invalid devices array provided');
        }

        const deviceId = await banbury.device.get_device_id(username || 'default');
        if (!deviceId) {
            throw new Error('Failed to retrieve device ID');
        }

        const device = devices.find((device) => device._id === deviceId);
        if (!device) {
            throw new Error(`Device not found for ID: ${deviceId}`);
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
        console.error('Error in getSyncFolders:', error);
        return {
            syncingFiles: [],
            recentlyChanged: [],
            error: error instanceof Error ? error.message : 'An unknown error occurred'
        };
    }
};
