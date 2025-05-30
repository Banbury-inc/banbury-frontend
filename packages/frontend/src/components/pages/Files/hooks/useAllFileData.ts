import { useEffect, useState } from 'react';
import { DatabaseData } from '../types';
import { fetchAllData } from '../utils/fetchAllData';
import { fileWatcherEmitter } from '@banbury/core/src/device/watchdog';

export const useAllFileData = (
  username: string | null,
  filePath: string,
  currentView: 'files' | 'sync' | 'shared' | 'cloud' | 'google_drive',
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
          currentView,
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
      
      // Google Drive is handled in Files.tsx, skip here
      if (filePath === 'Core/GoogleDrive' || filePath.includes('Core/GoogleDrive/')) {
        setFileRows([]);
        return;
      }
      
      // For other views, filter by source first
      let filtered = fetchedFiles.filter(file => file.source === currentView);
      
      // If in 'files' view with a path, filter by path
      if (currentView === 'files' && filePath && filePath !== 'Core' && filePath !== 'Core/Devices') {
                 if (filePath.startsWith('Core/Devices/')) {
           const devicePathParts = filePath.split('/');
           const deviceName = devicePathParts[2];
           
           // Filter by device name first
           filtered = filtered.filter(file => file.device_name === deviceName || file.original_device === deviceName);
          
                     // If there's a specific path within the device (like BCloud)
           if (devicePathParts.length > 3) {
             const remainingPath = devicePathParts.slice(3).join('/');
             
             // For BCloud directory specifically, show files that are in the BCloud folder
             if (remainingPath === 'BCloud' || remainingPath.includes('BCloud')) {
               
               // If we're in the root BCloud directory, show all files in BCloud
               if (remainingPath === 'BCloud' || remainingPath === 'home/michael-mills/BCloud') {
                 filtered = filtered.filter(file => {
                   // Check if the file path contains BCloud
                   return file.file_path && (
                     file.file_path.includes('/BCloud/') || 
                     file.file_path.endsWith('/BCloud') ||
                     file.file_path.includes('BCloud/')
                   );
                 });
                                } else {
                   // We're in a subfolder of BCloud, filter by the specific path
                   const targetPath = remainingPath.startsWith('home/') ? '/' + remainingPath : remainingPath;
                   
                   filtered = filtered.filter(file => {
                     if (!file.file_path) return false;
                     
                     // For subfolders, show files that are directly in that folder
                     return file.file_path.includes(targetPath) || 
                            file.file_path.startsWith(targetPath + '/') ||
                            file.file_path.endsWith(targetPath);
                   });
                 }
             } else {
              // For other subdirectories
              const targetPath = '/' + remainingPath;
              filtered = filtered.filter(file => {
                if (!file.file_path) return false;
                
                // Files directly in this directory
                if (file.file_path === targetPath || file.file_path.endsWith(targetPath)) {
                  return true;
                }
                
                // Files in subdirectories - display only direct children
                if (file.file_path.includes(targetPath + '/')) {
                  const fileDirSegments = file.file_path.split('/').filter(Boolean).length;
                  const currentDirSegments = targetPath.split('/').filter(Boolean).length;
                  return fileDirSegments === currentDirSegments + 1;
                }
                
                return false;
              });
            }
          }
        }
      }
      
      setFileRows(filtered);
    } catch (error) {
      console.error('Error in filtering effect:', error);
    }
  }, [fetchedFiles, filePath, currentView]);

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
          currentView,
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
  }, [username, filePath, currentView]);

  return { isLoading, fileRows, fetchedFiles };
}; 
