import axios from 'axios';
import { DatabaseData } from '../types';
import banbury from '@banbury/core';
import { fetchDeviceData } from '@banbury/core/src/device/fetchDeviceData';

// Fetch regular files
export const fetchFilesData = async (
  username: string,
  filePath: string,
  existingFiles: DatabaseData[] = []
) => {
  try {
    // Fetch device information to check online status
    const deviceData = await fetchDeviceData(username);
    const deviceOnlineMap = new Map();
    
    if (Array.isArray(deviceData)) {
      deviceData.forEach(device => {
        deviceOnlineMap.set(device.device_name, device.online);
      });
    }

    const fileInfoResponse = await axios.post<{ files: any[] }>(
      `${banbury.config.url}/files/get_files_from_filepath/${username}/`,
      {
        global_file_path: filePath
      }
    );

    // Filter out files that already exist
    const existingFileKeys = new Set(
      existingFiles.map(file => `${file.file_path}-${file.device_name}`)
    );

    const uniqueNewFiles = fileInfoResponse.data.files.filter(file =>
      !existingFileKeys.has(`${file.file_path}-${file.device_name}`)
    );

    // Mark the source of files and add available status
    return uniqueNewFiles.map(file => {
      const isDeviceOnline = deviceOnlineMap.get(file.device_name);
      return {
        ...file,
        available: isDeviceOnline ? 'Available' : 'Unavailable',
        source: 'files' as const
      };
    });

  } catch (error) {
    console.error('Error fetching files data:', error);
    return [];
  }
};

// Fetch sync files
export const fetchSyncData = async (
  username: string,
  filePath: string
) => {
  try {
    // Fetch device information to check online status
    const deviceData = await fetchDeviceData(username);
    const deviceOnlineMap = new Map();
    
    if (Array.isArray(deviceData)) {
      deviceData.forEach(device => {
        deviceOnlineMap.set(device.device_name, device.online);
      });
    }
    
    // Only send filepath if it contains more than just Core/Sync (for subfolders)
    const includePath = filePath !== 'Core/Sync' && filePath.startsWith('Core/Sync/');
    
    const fileInfoResponse = await axios.post<{ files: any[] }>(
      `${banbury.config.url}/predictions/get_files_to_sync/${username}/`,
      {
        global_file_path: includePath ? filePath : undefined
      }
    );

    // Mark the source of files
    return fileInfoResponse.data.files.map(file => {
      // Ensure the file path has the correct Core/Sync prefix
      let syncFilePath = file.file_path || '';
      if (!syncFilePath.includes('Core/Sync/')) {
        syncFilePath = `Core/Sync/${file.file_name}`;
      }
      
      const isDeviceOnline = deviceOnlineMap.get(file.device_name);
      
      return {
        ...file,
        file_path: syncFilePath,
        file_parent: file.file_parent || 'Sync',
        available: isDeviceOnline ? 'Available' : 'Unavailable',
        source: 'sync' as const
      };
    });
    
  } catch (error) {
    console.error('Error fetching sync data:', error);
    return [];
  }
};

// Fetch shared files
export const fetchSharedData = async (
  username: string
) => {
  try {
    // Fetch device information to check online status
    const deviceData = await fetchDeviceData(username);
    const deviceOnlineMap = new Map();
    
    if (Array.isArray(deviceData)) {
      deviceData.forEach(device => {
        deviceOnlineMap.set(device.device_name, device.online);
      });
    }
    
    const response = await axios.post<{ status: string; shared_files: { shared_files: any[] } }>(
      `${banbury.config.url}/files/get_shared_files/`,
      {
        username: username
      }
    );

    // Handle the nested shared_files structure
    if (response.data?.shared_files?.shared_files && Array.isArray(response.data.shared_files.shared_files)) {
      const files = response.data.shared_files.shared_files;
      
      // Transform and mark the source
      return files.map(file => {
        // Ensure the file path has the correct Core/Shared prefix
        let filePath = file.file_path || '';
        if (!filePath.includes('Core/Shared/')) {
          filePath = `Core/Shared/${file.file_name}`;
        }
        
        const isDeviceOnline = deviceOnlineMap.get(file.device_name);
        
        return {
          _id: file._id || `file-${Math.random()}`,
          id: file._id || `file-${Math.random()}`,
          file_name: file.file_name,
          file_size: file.file_size || '0',
          file_path: filePath,
          device_ids: file.shared_with ? [file.shared_with] : [],
          is_public: file.is_public,
          date_uploaded: file.date_uploaded,
          date_modified: file.date_modified,
          file_parent: file.file_parent || 'Shared',
          original_device: file.original_device,
          available: isDeviceOnline ? 'Available' : 'Unavailable',
          file_priority: file.file_priority || '0',
          owner: file.owner,
          device_name: file.device_name || 'Unknown Device',
          deviceID: file.device_id || file.deviceID || '',
          kind: file.kind || 'file',
          source: 'shared' as const
        };
      });
    }
    return [];
    
  } catch (error) {
    console.error('Error fetching shared files:', error);
    return [];
  }
};

// Fetch all data based on the current view
export const fetchAllData = async (
  username: string,
  filePath: string,
  currentView: 'files' | 'sync' | 'shared',
  existingFiles: DatabaseData[] = []
) => {
  // When accessing Sync or Shared nodes directly, transform the path
  let adjustedPath = filePath;
  
  // Handle the case where we're selecting Sync or Shared from the tree view
  if (filePath === 'Core/Sync' || filePath === 'Sync') {
    adjustedPath = 'Core/Sync'; // Use the standard path for sync
  } else if (filePath === 'Core/Shared' || filePath === 'Shared') {
    adjustedPath = 'Core/Shared'; // Use the standard path for shared
  } else if (filePath.includes('Core/Sync/')) {
    // We're inside a Sync subfolder
    adjustedPath = filePath;
  } else if (filePath.includes('Core/Shared/')) {
    // We're inside a Shared subfolder  
    adjustedPath = filePath;
  }
  
  console.info(`Fetching ${currentView} data with path: ${adjustedPath}`);
  
  switch (currentView) {
    case 'files':
      return fetchFilesData(username, adjustedPath, existingFiles);
    case 'sync':
      return fetchSyncData(username, adjustedPath);
    case 'shared':
      return fetchSharedData(username);
    default:
      return [];
  }
}; 