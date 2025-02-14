import { update_sync_storage_capacity } from '@banbury/core/dist/device';

export const updateSyncStorage = async (username: string, value: string) => {
    return update_sync_storage_capacity(username, value);
}; 