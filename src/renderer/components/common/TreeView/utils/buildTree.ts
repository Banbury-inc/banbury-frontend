import { DatabaseData } from '../types';

export function buildTree(files: DatabaseData[]): DatabaseData[] {
  // Move the entire buildTree function here
  // ... (keep the existing buildTree implementation)


  // Create the root "Core" node
  const coreNode: DatabaseData = {
    id: 'core',
    file_type: 'directory',
    file_name: 'Core',
    file_size: '',
    file_path: '',
    shared_with: [],
    is_public: false,
    kind: 'Core',
    file_parent: '',
    date_uploaded: '',
    helpers: 0,
    available: '',
    deviceID: '',
    device_name: `Unnamed Device `,
    children: [],
    original_device: '',
  };

  // Group files by a unique device identifier based on the device name
  const devicesMap = new Map<string, DatabaseData>();

  files.forEach((file, index) => {
    // Create a unique key based on the device name
    const uniqueDeviceKey = file.device_name || `Unnamed-Device-${index}`;

    if (!devicesMap.has(uniqueDeviceKey)) {
      // Create a device node if it doesn't already exist in the map
      const deviceNode: DatabaseData = {
        id: `device-${uniqueDeviceKey.replace(/\s+/g, '-')}`, // Replace spaces with dashes for a cleaner ID
        file_type: 'directory',
        file_name: file.device_name || `Unnamed Device ${index}`,
        date_uploaded: '',
        file_size: '',
        file_path: '',
        shared_with: [],
        is_public: false,
        helpers: 0,
        available: '',
        kind: 'Device',
        file_parent: 'core',
        deviceID: file.deviceID || `undefined-${index}`,
        device_name: file.device_name || `Unnamed Device ${index}`,
        children: [],
        original_device: file.original_device,
      };
      devicesMap.set(uniqueDeviceKey, deviceNode);
    }

    // Get the device node from the map
    const deviceNode = devicesMap.get(uniqueDeviceKey);

    // Create or update the file structure under the device node
    const filePathParts = file.file_path.split('/').filter(Boolean);
    let currentNode = deviceNode;

    filePathParts.forEach((part, partIndex) => {
      // Determine if this part of the path is the last one (i.e., the actual file or the last directory in the path)
      const isLastPart = partIndex === filePathParts.length - 1;

      // Check if the current part already exists as a child node of the current directory
      const existingNode = currentNode!.children?.find(child => child.file_name === part);

      if (existingNode) {
        // If the part exists, set it as the current node to continue building the path
        currentNode = existingNode;
      } else {
        // If the part doesn't exist, create a new node for this part
        const newNode: DatabaseData = {
          id: `${uniqueDeviceKey.replace(/\s+/g, '-')}-${part}-${partIndex}`,
          file_type: isLastPart ? file.file_type : 'directory', // Set as 'directory' if it's not the last part
          file_name: part, // Name the node after the current part of the path
          date_uploaded: '',
          file_size: '',
          helpers: 0,
          available: '',
          shared_with: [],
          is_public: false,
          // Only use the original file's path for the new node if it's the last part (actual file or directory)
          file_path: isLastPart ? file.file_path : `${currentNode!.file_path}/${part}`,
          kind: isLastPart ? file.kind : 'Folder', // If it's the last part, use the file's kind, otherwise 'Folder'
          file_parent: currentNode!.id, // Set the current node's ID as the parent
          deviceID: file.deviceID || `undefined-${index}`, // Use the device ID, or a placeholder if undefined
          device_name: file.device_name || `Unnamed Device ${index}`, // Use the device name, or a placeholder if undefined
          children: isLastPart && file.file_type !== 'directory' ? undefined : [], // Initialize children unless it's the last part and not a directory
          original_device: file.original_device,
        };

        // Add the newly created node to the current node's children
        currentNode!.children?.push(newNode);
        // Update currentNode to the new node to continue building the path
        currentNode = newNode;
      }

      // If this is the last part and it's a directory, push the file object itself as a child
      // if (isLastPart && file.fileType === 'directory') {
      // currentNode!.children?.push(file);
      // }
    });
  });

  // Add all device nodes to the core node's children
  devicesMap.forEach(deviceNode => {
    coreNode.children!.push(deviceNode);
  });

  // Return the tree with "Core" as the root
  return [coreNode];
}


