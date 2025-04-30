import { useEffect, useState } from 'react';
import { DatabaseData } from '../types';
import { fetchAllData } from '../utils/fetchAllData';
import { fetchDeviceData } from '@banbury/core/src/device/fetchDeviceData';
import { fileWatcherEmitter } from '@banbury/core/src/device/watchdog';

export const useAllFileData = (
  username: string | null,
  filePath: string,
  filePathDevice: string | null,
  currentView: 'files' | 'sync' | 'shared',
  setFirstname: (name: string) => void,
  setLastname: (name: string) => void,
  files: any,
  sync_files: any,
  devices: any[],
  setDevices: (devices: any[]) => void
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [fileRows, setFileRows] = useState<DatabaseData[]>([]);
  const [fetchedFiles, setFetchedFiles] = useState<DatabaseData[]>([]);

  // Initial data fetch when component mounts or when view, path, or updates change
  useEffect(() => {
    const fetchAndUpdateData = async () => {
      setIsLoading(true);
      
      // Fetch device data if needed
      if (!devices || devices.length === 0) {
        const deviceData = await fetchDeviceData(username || '');
        setDevices(Array.isArray(deviceData) ? deviceData : []);
      }
      
      // Fetch files based on current view
      const newFiles = await fetchAllData(
        username || '',
        filePath,
        currentView,
        fetchedFiles
      );
      
      if (newFiles && newFiles.length > 0) {
        // Create a Map to store unique files
        const uniqueFilesMap = new Map<string, DatabaseData>();
        
        // Add existing fetched files to the Map
        fetchedFiles
          .filter(file => file.source === currentView) // Only keep files from current view
          .forEach(file => {
            const uniqueKey = `${file.file_path}-${file.device_name}-${file.source}`;
            uniqueFilesMap.set(uniqueKey, file);
          });
        
        // Add new files to the Map (will automatically overwrite duplicates)
        newFiles.forEach(file => {
          const uniqueKey = `${file.file_path}-${file.device_name}-${file.source}`;
          uniqueFilesMap.set(uniqueKey, file);
        });
        
        // Convert Map back to array
        const updatedFiles = Array.from(uniqueFilesMap.values());
        
        setFetchedFiles(prevFiles => {
          // Keep files from other views, replace files from current view
          const otherViewFiles = prevFiles.filter(file => file.source !== currentView);
          return [...otherViewFiles, ...updatedFiles];
        });
        
        // Set the current view's files to fileRows
        setFileRows(updatedFiles);
      } else {
        // If no files found for current view, set empty array
        setFileRows([]);
      }
      
      setIsLoading(false);
    };

    fetchAndUpdateData();
  }, [username, filePath, currentView, devices, setDevices]);

  // Listen for file changes
  useEffect(() => {
    const handleFileChange = async () => {
      // Re-fetch files when changes are detected
      const newFiles = await fetchAllData(
        username || '',
        filePath,
        currentView,
        fetchedFiles
      );
      
      if (newFiles && newFiles.length > 0) {
        // Update files using same logic as above
        const uniqueFilesMap = new Map<string, DatabaseData>();
        
        fetchedFiles
          .filter(file => file.source === currentView)
          .forEach(file => {
            const uniqueKey = `${file.file_path}-${file.device_name}-${file.source}`;
            uniqueFilesMap.set(uniqueKey, file);
          });
        
        newFiles.forEach(file => {
          const uniqueKey = `${file.file_path}-${file.device_name}-${file.source}`;
          uniqueFilesMap.set(uniqueKey, file);
        });
        
        const updatedFiles = Array.from(uniqueFilesMap.values());
        
        setFetchedFiles(prevFiles => {
          const otherViewFiles = prevFiles.filter(file => file.source !== currentView);
          return [...otherViewFiles, ...updatedFiles];
        });
        
        setFileRows(updatedFiles);
      }
    };

    fileWatcherEmitter.on('fileChanged', handleFileChange);
    return () => {
      fileWatcherEmitter.off('fileChanged', handleFileChange);
    };
  }, [username, filePath, currentView, fetchedFiles]);

  return { isLoading, fileRows, fetchedFiles };
}; 