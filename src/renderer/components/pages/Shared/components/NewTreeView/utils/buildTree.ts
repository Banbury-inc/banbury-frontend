import { DatabaseData } from '../types';

export function buildTree(files: DatabaseData[]): DatabaseData[] {

  // Create only the "Shared" node
  const sharedNode: DatabaseData = {
    _id: 'Shared',
    id: 'Shared',
    file_type: 'directory',
    file_name: 'Shared',
    file_size: '',
    file_path: '',
    is_public: false,
    kind: 'SharedFolder',
    file_parent: '', // Remove Core as parent
    date_uploaded: '',
    date_modified: '',
    helpers: 0,
    available: '',
    owner: '',
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
    if (file.file_path.includes('Shared/')) { // Modified condition
      // Create a file node directly under Cloud Sync
      const fileNode: DatabaseData = {
        _id: file._id,
        id: file._id,
        file_type: file.file_type,
        file_name: file.file_path.split('/').pop() || '',
        file_size: file.file_size,
        file_path: file.file_path,
        kind: file.kind,
        file_parent: 'Shared',
        date_uploaded: file.date_uploaded,
        date_modified: file.date_modified,
        is_public: file.is_public,
        helpers: file.helpers,
        available: file.available,
        owner: file.owner,
        deviceID: file.deviceID,
        device_name: file.device_name,
        original_device: file.original_device,
      };
      sharedNode.children!.push(fileNode);
    }
  });

  // Return only the Shared node
  return [sharedNode];
}


