import axios from 'axios';
import { DatabaseData } from '../types';
import banbury from '@banbury/core';
import { fetchDeviceData } from '@banbury/core/src/device/fetchDeviceData';
import { listGoogleDriveFiles } from '@banbury/core/src/files/googleDrive';

// Helper function to create device online map
const createDeviceOnlineMap = async () => {
  try {
    const deviceData = await fetchDeviceData();
    const deviceOnlineMap = new Map();
    
    if (Array.isArray(deviceData)) {
      deviceData.forEach(device => {
        deviceOnlineMap.set(device.device_name, device.online);
      });
    }
    
    return deviceOnlineMap;
  } catch (error) {
    console.error('Error fetching device data:', error);
    return new Map();
  }
};

// Fetch regular files
export const fetchFilesData = async (
  filePath: string,
  existingFiles: DatabaseData[] = []
) => {
  try {
    const deviceOnlineMap = await createDeviceOnlineMap();

    const fileInfoResponse = await axios.post<{ files: any[] }>(
      `${banbury.config.url}/files/get_files_from_filepath/`,
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
  filePath: string
) => {
  try {
    const deviceOnlineMap = await createDeviceOnlineMap();
    
    // Only send filepath if it contains more than just Core/Sync (for subfolders)
    const includePath = filePath !== 'Core/Sync' && filePath.startsWith('Core/Sync/');
    
    const fileInfoResponse = await axios.post<{ files: any[] }>(
      `${banbury.config.url}/predictions/get_files_to_sync/`,
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
) => {
  try {
    const deviceOnlineMap = await createDeviceOnlineMap();
    
    const response = await axios.post<{ status: string; shared_files: { shared_files: any[] } }>(
      `${banbury.config.url}/files/get_shared_files/`,
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

// Helper function to extract Google Drive folder ID from path
const extractGoogleDriveFolderId = (filePath: string): string | undefined => {
  // If we're at the root Google Drive, return undefined (root folder)
  if (filePath === 'Core/GoogleDrive' || filePath === 'GoogleDrive') {
    return undefined;
  }
  
  // For now, we'll implement a simple path-based navigation
  // In a full implementation, you'd want to store folder IDs in the path or use a mapping
  // Example: Core/GoogleDrive/FolderName -> extract folder ID from database or cache
  
  // This is a placeholder - you might want to implement a folder ID mapping system
  // For now, return undefined to show root files
  return undefined;
};

// Fetch Google Drive files
export const fetchGoogleDriveData = async (
  filePath: string
) => {
  try {
    // Check if Google Drive integration is enabled before making API calls
    const { banbury } = await import('@banbury/core');
    const isGoogleDriveEnabled = await banbury.settings.isGoogleDriveEnabled();
    if (!isGoogleDriveEnabled) {
      return [];
    }

    // Extract folder ID from path for subfolder navigation
    const folderId = extractGoogleDriveFolderId(filePath);

    const result = await listGoogleDriveFiles(undefined, folderId);
    
    // Check if result and result.files exist
    if (!result || !result.files || !Array.isArray(result.files)) {
      console.warn('Invalid response from Google Drive API:', result);
      return [];
    }
    
    // Transform Google Drive files to match DatabaseData format
    const transformedFiles = result.files.map((file) => {
      // Create proper file path based on current location
      let googleDriveFilePath = '';
      if (filePath === 'Core/GoogleDrive' || filePath === 'GoogleDrive') {
        googleDriveFilePath = `Core/GoogleDrive/${file.file_name}`;
      } else {
        // For subfolders, append to the current path
        googleDriveFilePath = `${filePath}/${file.file_name}`;
      }

      return {
        _id: file.id,
        id: file.id,
        file_name: file.file_name,
        file_size: file.file_size,
        file_path: googleDriveFilePath,
        kind: file.kind,
        device_name: 'Google Drive',
        available: 'Available',
        date_uploaded: file.date_uploaded,
        date_modified: file.date_modified,
        file_parent: filePath === 'Core/GoogleDrive' ? 'GoogleDrive' : filePath.split('/').pop() || 'GoogleDrive',
        original_device: 'Google Drive',
        file_priority: '1',
        is_public: false,
        deviceID: '',
        helpers: 0,
        mime_type: file.mime_type,
        web_view_link: file.web_view_link,
        thumbnail_link: file.thumbnail_link,
        parents: file.parents,
        google_drive_id: file.id, // Store the actual Google Drive file ID
        source: 'google_drive' as const
      };
    });

    // Sort files: folders first, then files, both alphabetically
    transformedFiles.sort((a, b) => {
      const aIsFolder = a.kind === 'Folder';
      const bIsFolder = b.kind === 'Folder';
      
      // If one is folder and other is file, folder comes first
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      
      // If both are same type, sort alphabetically
      return a.file_name.localeCompare(b.file_name);
    });

    return transformedFiles;
    
  } catch (error) {
    console.error('Error fetching Google Drive files:', error);
    
    // Check if it's an authentication error
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response?.status === 401) {
        throw new Error('GOOGLE_DRIVE_AUTH_REQUIRED');
      }
    }
    
    return [];
  }
};

// Fetch all data based on the current view
export const fetchAllData = async (
  filePath: string,
  currentView: 'files' | 'sync' | 'shared' | 'cloud' | 'google_drive',
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
  
  switch (currentView) {
    case 'files':
      return fetchFilesData(adjustedPath, existingFiles);
    case 'sync':
      return fetchSyncData(adjustedPath);
    case 'shared':
      return fetchSharedData();
    case 'cloud':
      return fetchGoogleDriveData(filePath);
    case 'google_drive':
      return fetchGoogleDriveData(filePath);
    default:
      return [];
  }
}; 
