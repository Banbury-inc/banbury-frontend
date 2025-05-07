import banbury from '@banbury/core';

export * from './commands';

export async function getScannedFolders(username: string): Promise<{ result: string; username: string; } | 'failed' | 'exists' | 'task_add failed'> {
    const response = await banbury.device.get_scanned_folders(username);
    return response;
} 


export async function getDeviceId(username: string) {
    const response = await banbury.device.getDeviceId(username);
    return response;
} 
