import banbury from '@banbury/core';

export async function getScannedFolders(username: string): Promise<{ result: string; username: string; } | 'failed' | 'exists' | 'task_add failed'> {
    const response = await banbury.device.get_scanned_folders(username);
    return response;
} 
