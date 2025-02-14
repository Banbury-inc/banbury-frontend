import { download_request, connect } from './connect';

export * from './deviceInfo'
export * from './connect'
export * from './scanFilesystem'
export * from './declare_online'
export * from './declare_offline'
export * from './delete_device'
export * from './watchdog'
export * from './add_scanned_folder'
export * from './remove_scanned_folder'
export * from './get_scanned_folders'
export * from './add_file_to_sync'
export * from './update_sync_storage_capacity'
export * from './updateScoreConfigurationPreferences'
export * from './remove_file_from_sync'
export * from './get_single_device_info'
export * from './get_single_device_info_with_device_name'
export * from './update_scan_progress'
export * from './scanFolder'
export * from './fetchDeviceData'
export * from './remove_file_from_sync'



export const device = {
    connect,
    download_request,
};