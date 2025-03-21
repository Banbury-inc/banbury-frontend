import { add_scanned_folder } from '@banbury/core/dist/device';

export const addScannedFolder = async (directory: string, username: string) => {
    return add_scanned_folder(directory, username);
}; 