import banbury from '@banbury/core';

export * from './commands';

export async function getScannedFolders(): Promise<{ result: string } | 'failed' | 'exists' | 'task_add failed'> {
    const response = await banbury.device.getScannedFolders();
    return response;
} 


export async function getDeviceId() {
    const response = await banbury.device.getDeviceId();
    return response;
} 



