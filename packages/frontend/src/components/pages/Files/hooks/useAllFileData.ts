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

  // Initial data fetch when component mounts or when view, path, or updates change
  useEffect(() => {
    const loadFiles = async () => {
      if (!username) {
        setFileRows([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        // Don't fetch Google Drive data here - it's handled in Files.tsx
        if (currentView === 'google_drive') {
          setFileRows([]);
          setIsLoading(false);
          return;
        }

        const data = await fetchAllData(
          username,
          filePath, 
          filePathDevice,
          currentView,
          devices
        );
        
        setFileRows(data);
        setFetchedFiles(data);
      } catch (error) {
        console.error('Error loading files:', error);
        setFileRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [username, filePath, filePathDevice, currentView, devices, updates]);

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
      
      // Google Drive is handled in Files.tsx, skip here
      if (filePath === 'Core/GoogleDrive' || filePath.includes('Core/GoogleDrive/')) {
        setFileRows([]);
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
      // Don't handle file changes for Google Drive - it's handled in Files.tsx
      if (currentView === 'google_drive') {
        return;
      }

      // Re-fetch files when changes are detected
      try {
        const newFiles = await fetchAllData(
          username,
          filePath,
          filePathDevice,
          currentView,
          devices
        );
        
        if (newFiles && newFiles.length > 0) {
          setFetchedFiles(newFiles);
        }
      } catch (error) {
        console.error('Error refetching files after change:', error);
      }
    };

    // Set up the file watcher
    fileWatcherEmitter.on('fileChange', handleFileChange);

    // Cleanup
    return () => {
      fileWatcherEmitter.off('fileChange', handleFileChange);
    };
  }, [username, filePath, filePathDevice, currentView, devices]);

  return { isLoading, fileRows, fetchedFiles };
}; 
