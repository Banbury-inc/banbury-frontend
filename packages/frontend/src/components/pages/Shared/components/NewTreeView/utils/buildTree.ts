import { DatabaseData } from '../../../types/index';

export function buildTree(files: DatabaseData[]): DatabaseData[] {

  // Create only the "Shared" node
  const sharedNode: DatabaseData = {
    _id: 'Shared',
    id: 'Shared',
    file_name: 'Shared',
    kind: 'SharedFolder',
    date_uploaded: '',
    date_modified: '',
    file_size: '',
    file_path: '',
    deviceID: '',
    device_name: '',
    helpers: 0,
    available: '',
    file_priority: 'low',
    device_ids: [],
    original_device: '',
    owner: '',
  };

  files.forEach((file, fileIndex) => {
    // Skip files without a device name
    if (!file.device_name) {
      return;
    }

    // Modify the path check to look for Cloud Sync files
    if (file.file_path.includes('Shared/')) {
      // Create a file node directly under Cloud Sync
      const fileNode: DatabaseData = {
        _id: file._id,
        id: `${file.id}-${fileIndex}-${Date.now()}`, // Make ID unique with index and timestamp
        file_name: file.file_name,
        kind: file.kind,
        date_uploaded: file.date_uploaded,
        date_modified: file.date_modified,
        file_size: file.file_size,
        file_path: file.file_path,
        deviceID: file.deviceID,
        device_name: file.device_name,
        helpers: file.helpers,
        available: file.available,
        file_priority: file.file_priority,
        device_ids: file.device_ids,
        original_device: file.original_device,
        owner: file.owner,
      };
      (sharedNode as any).children = (sharedNode as any).children || [];
      (sharedNode as any).children.push(fileNode);
    }
  });

  // Return only the Shared node
  return [sharedNode];
}


