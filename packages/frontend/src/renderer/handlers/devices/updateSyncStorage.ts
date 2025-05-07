import { updateSyncStorageCapacity } from '@banbury/core/dist/device';

export const updateSyncStorage = async (value: string) => {
    return updateSyncStorageCapacity(value);
}; 
