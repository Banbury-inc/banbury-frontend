import { DatabaseData } from '../types';

export function buildTree(files: DatabaseData[]): DatabaseData[] {
  // Move the entire buildTree function here
  // ... (keep the existing buildTree implementation)


  // Create only the "Cloud Sync" node
  const cloudSyncNode: DatabaseData = {
    _id: 'Cloud Sync',
    id: 'Cloud Sync',
    file_type: 'directory',
    file_name: 'Cloud Sync',
    file_size: '',
    file_path: '',
    kind: 'CloudSyncFolder',
    file_parent: '', // Remove Core as parent
    date_uploaded: '',
    helpers: 0,
    available: '',
    deviceID: '',
    device_name: '',
    children: [],
    original_device: '',
  };

  files.forEach((file) => {
    // Skip files without a device name
    if (!file.device_name) {
      return;
    }

    // Modify the path check to look for Cloud Sync files
    if (file.file_path.includes('Cloud Sync/')) { // Modified condition
      // Create a file node directly under Cloud Sync
      const fileNode: DatabaseData = {
        _id: file._id,
        id: file._id,
        file_type: file.file_type,
        file_name: file.file_path.split('/').pop() || '',
        file_size: file.file_size,
        file_path: file.file_path,
        kind: file.kind,
        file_parent: 'Cloud Sync',
        date_uploaded: file.date_uploaded,
        helpers: file.helpers,
        available: file.available,
        deviceID: file.deviceID,
        device_name: file.device_name,
        original_device: file.original_device,
      };
      cloudSyncNode.children!.push(fileNode);
    }
  });

  // Return only the Cloud Sync node
  return [cloudSyncNode];
}


