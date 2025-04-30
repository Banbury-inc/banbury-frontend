import { useEffect, useState } from 'react';
import { DatabaseData } from '../types';
import { fetchAllData } from '../utils/fetchAllData';
import { fetchDeviceData } from '@banbury/core/src/device/fetchDeviceData';
import { fileWatcherEmitter } from '@banbury/core/src/device/watchdog';
import banbury from '@banbury/core';

export const useAllFileData = (
  username: string | null,
  filePath: string,
  filePathDevice: string | null,
  currentView: 'files' | 'sync' | 'shared' | 's3files',
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
      
      let newFiles: DatabaseData[] = [];
      
      // Special handling for S3 files
      if (currentView === 's3files') {
        try {
          const s3Result = await banbury.files.listS3Files(username || '');
          if (s3Result && s3Result.files) {
            // Convert S3 files to DatabaseData format
            newFiles = s3Result.files.map((s3File: any, index: number) => ({
              id: s3File.file_id || `s3-file-${index}-${Date.now()}`,
              file_name: s3File.file_name,
              file_path: `Core/S3Files/${s3File.file_name}`,
              file_size: s3File.file_size,
              kind: s3File.file_type || 'File',
              device_name: s3File.device_name || 'S3 Storage',
              available: 'Available',
              date_uploaded: s3File.date_uploaded,
              date_modified: s3File.date_modified,
              s3_url: s3File.s3_url,
              source: 's3files',
              is_s3: true
            }));
          }
        } catch (error) {
          console.error('Error fetching S3 files:', error);
          newFiles = [];
        }
      } else {
        // Fetch files based on current view
        newFiles = await fetchAllData(
          username || '',
          filePath,
          currentView,
          fetchedFiles
        );
      }
      
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
          // For Sync, Shared, and S3 views, ensure file paths include the right prefix
          if (currentView === 'sync' && !file.file_path.includes('Core/Sync/')) {
            file.file_path = `Core/Sync/${file.file_path.split('/').pop() || file.file_name}`;
          } else if (currentView === 'shared' && !file.file_path.includes('Core/Shared/')) {
            file.file_path = `Core/Shared/${file.file_path.split('/').pop() || file.file_name}`;
          } else if (currentView === 's3files' && !file.file_path.includes('Core/S3Files/')) {
            file.file_path = `Core/S3Files/${file.file_path.split('/').pop() || file.file_name}`;
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
        
        // Set the current view's files to fileRows
        setFileRows(updatedFiles);
      }
      
      setIsLoading(false);
    };

    fetchAndUpdateData();
  }, [username, filePath, currentView]);

  // Listen for file changes
  useEffect(() => {
    const handleFileChange = async () => {
      // Re-fetch files when changes are detected
      let newFiles: DatabaseData[] = [];
      
      // Special handling for S3 files
      if (currentView === 's3files') {
        try {
          const s3Result = await banbury.files.listS3Files(username || '');
          if (s3Result && s3Result.files) {
            // Convert S3 files to DatabaseData format
            newFiles = s3Result.files.map((s3File: any, index: number) => ({
              id: s3File.file_id || `s3-file-${index}-${Date.now()}`,
              file_name: s3File.file_name,
              file_path: `Core/S3Files/${s3File.file_name}`,
              file_size: s3File.file_size,
              kind: s3File.file_type || 'File',
              device_name: s3File.device_name || 'S3 Storage',
              available: 'Available',
              date_uploaded: s3File.date_uploaded,
              date_modified: s3File.date_modified,
              s3_url: s3File.s3_url,
              source: 's3files',
              is_s3: true
            }));
          }
        } catch (error) {
          console.error('Error fetching S3 files:', error);
          newFiles = [];
        }
      } else {
        newFiles = await fetchAllData(
          username || '',
          filePath,
          currentView,
          fetchedFiles
        );
      }
      
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
          // For Sync, Shared, and S3 views, ensure file paths include the right prefix
          if (currentView === 'sync' && !file.file_path.includes('Core/Sync/')) {
            file.file_path = `Core/Sync/${file.file_path.split('/').pop() || file.file_name}`;
          } else if (currentView === 'shared' && !file.file_path.includes('Core/Shared/')) {
            file.file_path = `Core/Shared/${file.file_path.split('/').pop() || file.file_name}`;
          } else if (currentView === 's3files' && !file.file_path.includes('Core/S3Files/')) {
            file.file_path = `Core/S3Files/${file.file_path.split('/').pop() || file.file_name}`;
          }
          
          // Generate a unique ID if missing
          if (!file.id || file.id === undefined) {
            file.id = `file-${file.file_path}-${file.device_name}-${index}-${Date.now()}`;
          }
          const uniqueKey = `${file.file_path}-${file.device_name}-${file.source}`;
          uniqueFilesMap.set(uniqueKey, file);
        });
        
        const updatedFiles = Array.from(uniqueFilesMap.values());
        
        // Only update state if we actually have changes to make
        // This prevents unnecessary re-renders
        if (updatedFiles.length > 0) {
          setFetchedFiles(prevFiles => {
            const otherViewFiles = prevFiles.filter(file => file.source !== currentView);
            return [...otherViewFiles, ...updatedFiles];
          });
          
          setFileRows(updatedFiles);
        }
      }
    };

    fileWatcherEmitter.on('fileChanged', handleFileChange);
    return () => {
      fileWatcherEmitter.off('fileChanged', handleFileChange);
    };
  }, [username, filePath, currentView, fetchedFiles]);

  return { isLoading, fileRows, fetchedFiles };
}; 
