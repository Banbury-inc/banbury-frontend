import { useEffect, useState, useRef } from 'react';
import { DatabaseData } from '../types';
import { fetchAllData } from '../utils/fetchAllData';
import { fetchDeviceData } from '@banbury/core/src/device/fetchDeviceData';
import { fileWatcherEmitter } from '@banbury/core/src/device/watchdog';
import banbury from '@banbury/core';

export const useAllFileData = (
  username: string | null,
  filePath: string,
  filePathDevice: string | null,
  currentView: 'files' | 'sync' | 'shared' | 'cloud' | 'google_drive',
  setFirstname: (name: string) => void,
  setLastname: (name: string) => void,
  files: any,
  sync_files: any,
  devices: any[],
  setDevices: (devices: any[]) => void,
  updates?: number
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [fileRows, setFileRows] = useState<DatabaseData[]>([]);
  const [fetchedFiles, setFetchedFiles] = useState<DatabaseData[]>([]);
  const lastGoogleDriveFetchRef = useRef<number>(0);
  
  // Debounce Google Drive calls to prevent excessive API requests
  const GOOGLE_DRIVE_DEBOUNCE_MS = 2000;

  // Initial data fetch when component mounts or when view, path, or updates change
  useEffect(() => {
    const fetchAndUpdateData = async () => {
      setIsLoading(true);
      
      // Fetch device data if needed
      if (!devices || devices.length === 0) {
        const deviceData = await fetchDeviceData();
        setDevices(Array.isArray(deviceData) ? deviceData : []);
      }
      
      let newFiles: DatabaseData[] = [];
      
      // Use fetchAllData for all contexts including cloud
      newFiles = await fetchAllData(
        filePath,
        currentView,
        fetchedFiles
      );
      
      // If we actually have files OR we're explicitly switching contexts
      // This prevents clearing the view when API returns empty results temporarily
      if (newFiles && newFiles.length > 0) {
        // Create a Map to store unique files
        const uniqueFilesMap = new Map<string, DatabaseData>();
        
        // Add existing fetched files to the Map - only for the same context
        // This preserves files during navigation within the same context
        fetchedFiles
          .filter(file => file.source === currentView)
          .forEach(file => {
            const uniqueKey = `${file.file_path}-${file.device_name}-${file.source}`;
            uniqueFilesMap.set(uniqueKey, file);
          });
        
        // Add new files to the Map (will automatically overwrite duplicates)
        // Ensure each file has a unique ID
        newFiles.forEach((file, index) => {
          // For Sync, Shared, Google Drive, and S3 views, ensure file paths include the right prefix
          if (currentView === 'sync' && !file.file_path.includes('Core/Sync/')) {
            file.file_path = `Core/Sync/${file.file_path.split('/').pop() || file.file_name}`;
          } else if (currentView === 'shared' && !file.file_path.includes('Core/Shared/')) {
            file.file_path = `Core/Shared/${file.file_path.split('/').pop() || file.file_name}`;
          } else if (currentView === 'cloud' && !file.file_path.includes('Core/Cloud/')) {
            file.file_path = `Core/Cloud/${file.file_path.split('/').pop() || file.file_name}`;
          } else if (currentView === 'google_drive' && !file.file_path.includes('Core/GoogleDrive/')) {
            file.file_path = `Core/GoogleDrive/${file.file_path.split('/').pop() || file.file_name}`;
          }
          
          // Generate a unique ID if missing
          if (!file.id || file.id === undefined) {
            file.id = `file-${file.file_path}-${file.device_name}-${index}-${Date.now()}`;
          }
          const uniqueKey = `${file.file_path}-${file.device_name}-${file.source}`;
          uniqueFilesMap.set(uniqueKey, file);
        });
        
        // Convert Map back to array
        const updatedFiles = Array.from(uniqueFilesMap.values());
        
        // Keep previous files from other contexts, only update current context files
        setFetchedFiles(prevFiles => {
          const otherViewFiles = prevFiles.filter(file => file.source !== currentView);
          return [...otherViewFiles, ...updatedFiles];
        });
      }
      
      setIsLoading(false);
    };

    fetchAndUpdateData();
  }, [username, filePath, currentView, updates]);

  // Apply filtering based on filePathDevice or filePath
  useEffect(() => {
    try {
      if (!fetchedFiles || fetchedFiles.length === 0) {
        return;
      }
      
      // Different filtering logic based on path
      if (filePath === 'Core/Cloud') {
        // Find cloud files - either by source, path or device name
        const cloudFiles = fetchedFiles.filter(file => 
          file.source === 'cloud' || 
          file.file_path?.includes('Core/Cloud/') ||
          file.device_name === 'Cloud'
        );
        
        setFileRows(cloudFiles);
        return;
      }
      
      // Handle Google Drive files
      if (filePath === 'Core/GoogleDrive' || filePath.includes('Core/GoogleDrive/')) {
        const googleDriveFiles = fetchedFiles.filter(file => 
          file.source === 'google_drive' || 
          file.file_path?.includes('Core/GoogleDrive/') ||
          file.device_name === 'Google Drive'
        );
        
        setFileRows(googleDriveFiles);
        return;
      }
      
      // For other views, filter by source first
      let filtered = fetchedFiles.filter(file => file.source === currentView);
      
      // Filter by device if filePathDevice is set
      if (filePathDevice) {
        filtered = filtered.filter(file => file.device_name === filePathDevice);
      }
      
      // If in 'files' view with a path, filter by path
      if (currentView === 'files' && filePath && filePath !== 'Core' && filePath !== 'Core/Devices') {
        if (filePath.startsWith('Core/Devices/') && filePath.split('/').length > 3) {
          // For paths like Core/Devices/DeviceName/some/path
          const devicePathParts = filePath.split('/');
          const deviceName = devicePathParts[2];
          const remainingPath = '/' + devicePathParts.slice(3).join('/');
          
          filtered = filtered.filter(file => {
            if (file.device_name !== deviceName) {
              return false;
            }
            
            // Files directly in this directory
            if (file.file_path === remainingPath) {
              return true;
            }
            
            // Files in subdirectories - display only direct children
            if (file.file_path.startsWith(remainingPath + '/')) {
              // Count segments to ensure we only show immediate children
              const fileDirSegments = file.file_path.split('/').filter(Boolean).length;
              const currentDirSegments = remainingPath.split('/').filter(Boolean).length;
              return fileDirSegments === currentDirSegments + 1;
            }
            
            return false;
          });
        }
      }
      
      setFileRows(filtered);
    } catch (error) {
      console.error('Error in filtering effect:', error);
    }
  }, [fetchedFiles, filePathDevice, filePath, currentView]);

  // Listen for file changes
  useEffect(() => {
    const handleFileChange = async () => {
      // Re-fetch files when changes are detected
      let newFiles: DatabaseData[] = [];
      
      // Use fetchAllData for all contexts including cloud
      newFiles = await fetchAllData(
        filePath,
        currentView,
        fetchedFiles
      );
      
      if (newFiles && newFiles.length > 0) {
        // Update files using same logic as above
        const uniqueFilesMap = new Map<string, DatabaseData>();
        
        // Preserve existing files to prevent flicker
        fetchedFiles
          .filter(file => file.source === currentView)
          .forEach(file => {
            const uniqueKey = `${file.file_path}-${file.device_name}-${file.source}`;
            uniqueFilesMap.set(uniqueKey, file);
          });
        
        // Ensure each file has a unique ID
        newFiles.forEach((file, index) => {
          // For Sync, Shared, Google Drive, and S3 views, ensure file paths include the right prefix
          if (currentView === 'sync' && !file.file_path.includes('Core/Sync/')) {
            file.file_path = `Core/Sync/${file.file_path.split('/').pop() || file.file_name}`;
          } else if (currentView === 'shared' && !file.file_path.includes('Core/Shared/')) {
            file.file_path = `Core/Shared/${file.file_path.split('/').pop() || file.file_name}`;
          } else if (currentView === 'cloud' && !file.file_path.includes('Core/Cloud/')) {
            file.file_path = `Core/Cloud/${file.file_path.split('/').pop() || file.file_name}`;
          } else if (currentView === 'google_drive' && !file.file_path.includes('Core/GoogleDrive/')) {
            file.file_path = `Core/GoogleDrive/${file.file_path.split('/').pop() || file.file_name}`;
          }
          
          // Generate a unique ID if missing
          if (!file.id || file.id === undefined) {
            file.id = `file-${file.file_path}-${file.device_name}-${index}-${Date.now()}`;
          }
          const uniqueKey = `${file.file_path}-${file.device_name}-${file.source}`;
          uniqueFilesMap.set(uniqueKey, file);
        });
        
        const updatedFiles = Array.from(uniqueFilesMap.values());
        
        // Keep previous files from other contexts, only update current context files
        setFetchedFiles(prevFiles => {
          const otherViewFiles = prevFiles.filter(file => file.source !== currentView);
          return [...otherViewFiles, ...updatedFiles];
        });
      }
    };

    // Set up the file watcher
    fileWatcherEmitter.on('fileChange', handleFileChange);

    // Cleanup
    return () => {
      fileWatcherEmitter.off('fileChange', handleFileChange);
    };
  }, [filePath, currentView, fetchedFiles]);

  return { isLoading, fileRows, fetchedFiles };
}; 
