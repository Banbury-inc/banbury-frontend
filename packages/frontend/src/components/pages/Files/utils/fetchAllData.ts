import axios from 'axios';
import { DatabaseData } from '../types';
import banbury from '@banbury/core';

// Fetch regular files
export const fetchFilesData = async (
  username: string,
  filePath: string,
  existingFiles: DatabaseData[] = []
) => {
  try {
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

    // Mark the source of files
    return uniqueNewFiles.map(file => ({
      ...file,
      source: 'files' as const
    }));

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
    const fileInfoResponse = await axios.post<{ files: any[] }>(
      `${banbury.config.url}/predictions/get_files_to_sync/${username}/`,
      {
        global_file_path: filePath
      }
    );

    // Mark the source of files
    return fileInfoResponse.data.files.map(file => ({
      ...file,
      source: 'sync' as const
    }));
    
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
      return files.map(file => ({
        _id: file._id || `file-${Math.random()}`,
        id: file._id || `file-${Math.random()}`,
        file_name: file.file_name,
        file_size: file.file_size || '0',
        file_path: file.file_path,
        device_ids: file.shared_with ? [file.shared_with] : [],
        is_public: file.is_public,
        date_uploaded: file.date_uploaded,
        date_modified: file.date_modified,
        file_parent: file.file_parent,
        original_device: file.original_device,
        available: file.available,
        file_priority: file.file_priority || '0',
        owner: file.owner,
        device_name: file.device_name || 'Unknown Device',
        deviceID: file.device_id || file.deviceID || '',
        kind: file.kind || 'file',
        source: 'shared' as const
      }));
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
  switch (currentView) {
    case 'files':
      return fetchFilesData(username, filePath, existingFiles);
    case 'sync':
      return fetchSyncData(username, filePath);
    case 'shared':
      return fetchSharedData(username);
    default:
      return [];
  }
}; 