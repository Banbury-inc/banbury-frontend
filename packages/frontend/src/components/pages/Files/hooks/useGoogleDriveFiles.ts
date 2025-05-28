import { useState, useEffect } from 'react';
import { useAuth } from '../../../../renderer/context/AuthContext';
import { useAlert } from '../../../../renderer/context/AlertContext';
import { listGoogleDriveFiles } from '@banbury/core/src/files/googleDrive';
import { banbury } from '@banbury/core';

export interface GoogleDriveFileRow {
  id: string;
  file_name: string;
  kind: 'Folder' | 'File';
  file_size: number;
  date_modified?: string;
  date_uploaded?: string;
  mime_type: string;
  web_view_link?: string;
  thumbnail_link?: string;
  parents: string[];
  source: 'google_drive';
  device_name: string;
  available: string;
  file_priority: number;
  is_public: boolean;
  original_device: string;
  file_path: string;
  google_drive_id?: string;
}

export const useGoogleDriveFiles = (filePath: string, updates?: number) => {
  const [googleDriveFiles, setGoogleDriveFiles] = useState<GoogleDriveFileRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [hasMorePages, setHasMorePages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [folderIdMap, setFolderIdMap] = useState<Map<string, string>>(new Map());
  const { showAlert } = useAlert();
  const { username } = useAuth();

  const isGoogleDrivePath = filePath.includes('Core/GoogleDrive') || filePath === 'GoogleDrive';

  // Helper function to extract folder ID from path
  const extractFolderId = (path: string): string | undefined => {
    
    // For root Google Drive, return undefined
    if (path === 'Core/GoogleDrive' || path === 'GoogleDrive') {
      return undefined;
    }
    
    // For subfolders, we need to extract the folder ID
    // The path format should be: Core/GoogleDrive/FolderName or Core/GoogleDrive/FolderName/SubFolderName
    const pathParts = path.split('/');
    
    // Find the Google Drive part and get the folder structure after it
    const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
    if (googleDriveIndex === -1 || googleDriveIndex === pathParts.length - 1) {
      return undefined; // No folder specified or GoogleDrive is the last part
    }
    
    // Get the folder path relative to GoogleDrive root
    const folderPath = pathParts.slice(googleDriveIndex + 1).join('/');
    
    // Look up the folder ID in our mapping
    const folderId = folderIdMap.get(folderPath);
    
    if (folderId) {
      return folderId;
    }
    
    // If we don't have the folder ID mapped, try to find it by looking at the last folder name
    // This is a fallback for when the mapping isn't complete
    const lastFolderName = pathParts[pathParts.length - 1];
    
    // Look through all mapped folders to see if any end with this folder name
    for (const [mappedPath, mappedId] of folderIdMap.entries()) {
      const mappedPathParts = mappedPath.split('/');
      if (mappedPathParts[mappedPathParts.length - 1] === lastFolderName) {
        return mappedId;
      }
    }
    return undefined;
  };

  useEffect(() => {
    if (!isGoogleDrivePath || !username) {
      setGoogleDriveFiles([]);
      setAuthRequired(false);
      setNextPageToken(undefined);
      setHasMorePages(false);
      return;
    }

    const fetchGoogleDriveFiles = async () => {
      try {
        // Check if Google Drive integration is enabled before making API calls
        const isGoogleDriveEnabled = await banbury.settings.isGoogleDriveEnabled();
        if (!isGoogleDriveEnabled) {
          setGoogleDriveFiles([]);
          setIsLoading(false);
          setAuthRequired(false);
          setNextPageToken(undefined);
          setHasMorePages(false);
          return;
        }

        setIsLoading(true);
        setAuthRequired(false);
        
        // Clear existing files when navigating to a new folder
        setGoogleDriveFiles([]);
        
        // Extract folder ID from path for subfolder navigation
        const folderId = extractFolderId(filePath);

        // Reset pagination when fetching initial files
        const result = await listGoogleDriveFiles(undefined, folderId);
        
        // Check if result and result.files exist
        if (!result || !result.files || !Array.isArray(result.files)) {
          setGoogleDriveFiles([]);
          setNextPageToken(undefined);
          setHasMorePages(false);
          return;
        }
        
        // Store pagination info
        setNextPageToken(result.nextPageToken);
        setHasMorePages(!!result.nextPageToken);
        
        // Transform Google Drive files to match your file row structure
        const transformedFiles: GoogleDriveFileRow[] = result.files.map((file) => {
          // Create proper file path based on current location
          let googleDriveFilePath = '';
          if (filePath === 'Core/GoogleDrive' || filePath === 'GoogleDrive') {
            googleDriveFilePath = `Core/GoogleDrive/${file.file_name}`;
          } else {
            // For subfolders, append to the current path
            googleDriveFilePath = `${filePath}/${file.file_name}`;
          }

          // Store folder ID mapping for folders as we discover them
          if (file.kind === 'Folder') {
            const pathParts = googleDriveFilePath.split('/');
            const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
            if (googleDriveIndex !== -1 && googleDriveIndex < pathParts.length - 1) {
              const folderPath = pathParts.slice(googleDriveIndex + 1).join('/');
              setFolderIdMap(prev => {
                const newMap = new Map(prev);
                newMap.set(folderPath, file.id);
                return newMap;
              });
            }
          }

          return {
            id: file.id,
            file_name: file.file_name,
            kind: file.kind,
            file_size: file.file_size,
            date_modified: file.date_modified,
            date_uploaded: file.date_uploaded,
            mime_type: file.mime_type,
            web_view_link: file.web_view_link,
            thumbnail_link: file.thumbnail_link,
            parents: file.parents,
            source: 'google_drive',
            device_name: 'Google Drive',
            available: 'Available',
            file_priority: 1,
            is_public: false,
            original_device: 'Google Drive',
            file_path: googleDriveFilePath,
            google_drive_id: file.id
          };
        });

        setGoogleDriveFiles(transformedFiles);
      } catch (error: any) {
        console.error('Error fetching Google Drive files:', error);
        
        if (error.response?.status === 401 || error.message === 'GOOGLE_DRIVE_AUTH_REQUIRED') {
          setAuthRequired(true);
          showAlert(
            'Google Drive Authentication Required',
            [
              'Your Google Drive access has expired or is not configured.',
              'Please re-authenticate with Google to access your Drive files.',
              'Go to Settings > Account > Connect Google Drive.'
            ],
            'warning'
          );
        } else {
          showAlert(
            'Error Loading Google Drive Files',
            [
              'Failed to load Google Drive files. Please try again later.',
              error.message || 'Unknown error occurred.'
            ],
            'error'
          );
        }
        setGoogleDriveFiles([]);
        setNextPageToken(undefined);
        setHasMorePages(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoogleDriveFiles();
  }, [filePath, username, isGoogleDrivePath, showAlert, updates]);

  const refreshFiles = async () => {
    if (!isGoogleDrivePath || !username) return;
    
    // Check if Google Drive integration is enabled before making API calls
    try {
      const isGoogleDriveEnabled = await banbury.settings.isGoogleDriveEnabled();
      if (!isGoogleDriveEnabled) {
        setGoogleDriveFiles([]);
        setAuthRequired(false);
        setNextPageToken(undefined);
        setHasMorePages(false);
        return;
      }
    } catch (error) {
      console.error('Error checking Google Drive status:', error);
      setGoogleDriveFiles([]);
      setAuthRequired(false);
      setNextPageToken(undefined);
      setHasMorePages(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const folderId = extractFolderId(filePath);
      const result = await listGoogleDriveFiles(undefined, folderId);
      
      // Check if result and result.files exist
      if (!result || !result.files || !Array.isArray(result.files)) {
        setGoogleDriveFiles([]);
        setNextPageToken(undefined);
        setHasMorePages(false);
        return;
      }
      
      // Store pagination info
      setNextPageToken(result.nextPageToken);
      setHasMorePages(!!result.nextPageToken);
      
      const transformedFiles: GoogleDriveFileRow[] = result.files.map((file) => {
        let googleDriveFilePath = '';
        if (filePath === 'Core/GoogleDrive' || filePath === 'GoogleDrive') {
          googleDriveFilePath = `Core/GoogleDrive/${file.file_name}`;
        } else {
          googleDriveFilePath = `${filePath}/${file.file_name}`;
        }

        // Store folder ID mapping for folders as we discover them
        if (file.kind === 'Folder') {
          const pathParts = googleDriveFilePath.split('/');
          const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
          if (googleDriveIndex !== -1 && googleDriveIndex < pathParts.length - 1) {
            const folderPath = pathParts.slice(googleDriveIndex + 1).join('/');
            setFolderIdMap(prev => {
              const newMap = new Map(prev);
              newMap.set(folderPath, file.id);
              return newMap;
            });
          }
        }

        return {
          id: file.id,
          file_name: file.file_name,
          kind: file.kind,
          file_size: file.file_size,
          date_modified: file.date_modified,
          date_uploaded: file.date_uploaded,
          mime_type: file.mime_type,
          web_view_link: file.web_view_link,
          thumbnail_link: file.thumbnail_link,
          parents: file.parents,
          source: 'google_drive',
          device_name: 'Google Drive',
          available: 'Available',
          file_priority: 1,
          is_public: false,
          original_device: 'Google Drive',
          file_path: googleDriveFilePath,
          google_drive_id: file.id
        };
      });

      setGoogleDriveFiles(transformedFiles);
      setAuthRequired(false);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setAuthRequired(true);
      }
      setNextPageToken(undefined);
      setHasMorePages(false);
    } finally {
      setIsLoading(false);
    }
  };

    const loadMoreFiles = async () => {
    if (!isGoogleDrivePath || !username || !nextPageToken || isLoadingMore) return;

    // Check if Google Drive integration is enabled before making API calls
    try {
      const isGoogleDriveEnabled = await banbury.settings.isGoogleDriveEnabled();
      if (!isGoogleDriveEnabled) {
        return;
      }
    } catch (error) {
      console.error('Error checking Google Drive status:', error);
      return;
    }

    try {
      setIsLoadingMore(true);
      const folderId = extractFolderId(filePath);
      
      // Use the nextPageToken to get the next page
      const result = await listGoogleDriveFiles(nextPageToken, folderId);
      
      // Check if result and result.files exist
      if (!result || !result.files || !Array.isArray(result.files)) {
        return;
      }
      
      // Update pagination info
      setNextPageToken(result.nextPageToken);
      setHasMorePages(!!result.nextPageToken);
      
      // Transform new files
      const transformedFiles: GoogleDriveFileRow[] = result.files.map((file) => {
        let googleDriveFilePath = '';
        if (filePath === 'Core/GoogleDrive' || filePath === 'GoogleDrive') {
          googleDriveFilePath = `Core/GoogleDrive/${file.file_name}`;
        } else {
          googleDriveFilePath = `${filePath}/${file.file_name}`;
        }

        // Store folder ID mapping for folders as we discover them
        if (file.kind === 'Folder') {
          const pathParts = googleDriveFilePath.split('/');
          const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
          if (googleDriveIndex !== -1 && googleDriveIndex < pathParts.length - 1) {
            const folderPath = pathParts.slice(googleDriveIndex + 1).join('/');
            setFolderIdMap(prev => {
              const newMap = new Map(prev);
              newMap.set(folderPath, file.id);
              return newMap;
            });
          }
        }

        return {
          id: file.id,
          file_name: file.file_name,
          kind: file.kind,
          file_size: file.file_size,
          date_modified: file.date_modified,
          date_uploaded: file.date_uploaded,
          mime_type: file.mime_type,
          web_view_link: file.web_view_link,
          thumbnail_link: file.thumbnail_link,
          parents: file.parents,
          source: 'google_drive',
          device_name: 'Google Drive',
          available: 'Available',
          file_priority: 1,
          is_public: false,
          original_device: 'Google Drive',
          file_path: googleDriveFilePath,
          google_drive_id: file.id
        };
      });

      // Append new files to existing ones
      setGoogleDriveFiles(prevFiles => [...prevFiles, ...transformedFiles]);
      
    } catch (error: any) {
      showAlert(
        'Error Loading More Files',
        [
          'Failed to load more Google Drive files. Please try again.',
          error.message || 'Unknown error occurred.'
        ],
        'error'
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const navigateToFolder = (folderFile: GoogleDriveFileRow, setFilePath: (path: string) => void) => {
    if (folderFile.kind !== 'Folder') {
      console.warn('Attempted to navigate to non-folder item:', folderFile);
      return;
    }

    // Create the new path
    const newPath = folderFile.file_path;
    
    // Store the folder ID mapping BEFORE navigation
    const pathParts = newPath.split('/');
    const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
    if (googleDriveIndex !== -1 && googleDriveIndex < pathParts.length - 1) {
      const folderPath = pathParts.slice(googleDriveIndex + 1).join('/');
      
      // Update the folder ID map immediately
      setFolderIdMap(prev => {
        const newMap = new Map(prev);
        newMap.set(folderPath, folderFile.id);
        return newMap;
      });
    }
    
    // Reset pagination and files before navigation
    setNextPageToken(undefined);
    setHasMorePages(false);
    setGoogleDriveFiles([]);
    
    // Navigate to the folder - this will trigger the useEffect to fetch new files
    setFilePath(newPath);
  };

  return {
    googleDriveFiles,
    isLoading: isGoogleDrivePath ? isLoading : false,
    isGoogleDrivePath,
    authRequired,
    refreshFiles,
    loadMoreFiles,
    hasMorePages,
    isLoadingMore,
    nextPageToken,
    navigateToFolder
  };
};

/**
 * Hook specifically for getting Google Drive files for tree view
 * This fetches all files without pagination for tree structure
 */
export const useGoogleDriveTreeFiles = () => {
  const [treeFiles, setTreeFiles] = useState<GoogleDriveFileRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const { showAlert } = useAlert();
  const { username } = useAuth();

  // Cache duration: 30 seconds
  const CACHE_DURATION = 30000;

  const fetchGoogleDriveTreeFiles = async (folderId?: string, parentPath: string = 'Core/GoogleDrive'): Promise<GoogleDriveFileRow[]> => {
    try {
      // Check if Google Drive integration is enabled before making API calls
      const isGoogleDriveEnabled = await banbury.settings.isGoogleDriveEnabled();
      if (!isGoogleDriveEnabled) {
        return [];
      }

      setIsLoading(true);
      setAuthRequired(false);
      
      const result = await listGoogleDriveFiles(undefined, folderId);
      
      if (!result || !result.files || !Array.isArray(result.files)) {
        return [];
      }
      
      // Transform Google Drive files to match tree structure
      const transformedFiles: GoogleDriveFileRow[] = result.files.map((file) => {
        const googleDriveFilePath = `${parentPath}/${file.file_name}`;

        return {
          id: file.id,
          file_name: file.file_name,
          kind: file.kind,
          file_size: file.file_size,
          date_modified: file.date_modified,
          date_uploaded: file.date_uploaded,
          mime_type: file.mime_type,
          web_view_link: file.web_view_link,
          thumbnail_link: file.thumbnail_link,
          parents: file.parents,
          source: 'google_drive',
          device_name: 'Google Drive',
          available: 'Available',
          file_priority: 1,
          is_public: false,
          original_device: 'Google Drive',
          file_path: googleDriveFilePath,
          google_drive_id: file.id
        };
      });

      return transformedFiles;
    } catch (error: any) {
      if (error.response?.status === 401 || error.message === 'GOOGLE_DRIVE_AUTH_REQUIRED') {
        setAuthRequired(true);
      } else {
        showAlert(
          'Error Loading Google Drive Files',
          [
            'Failed to load Google Drive files for tree view.',
            error.message || 'Unknown error occurred.'
          ],
          'error'
        );
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTreeFiles = async () => {
    if (!username) return;
    
    // Check if Google Drive integration is enabled before making API calls
    try {
      const isGoogleDriveEnabled = await banbury.settings.isGoogleDriveEnabled();
      if (!isGoogleDriveEnabled) {
        // Clear any existing files if Google Drive is disabled
        setTreeFiles([]);
        return;
      }
    } catch (error) {
      console.error('Error checking Google Drive status:', error);
      setTreeFiles([]);
      return;
    }
    
    // Check if we should skip this refresh due to caching
    const now = Date.now();
    if (now - lastFetchTime < CACHE_DURATION && treeFiles.length > 0) {
      return;
    }
    
    try {
      const files = await fetchGoogleDriveTreeFiles();
      setTreeFiles(files);
      setLastFetchTime(now);
    } catch (error: any) {
      showAlert(
        'Error Refreshing Google Drive Files',
        [
          'Failed to refresh Google Drive files for tree view.',
          error.message || 'Unknown error occurred.'
        ],
        'error'
      );
    }
  };

  useEffect(() => {
    if (username) {
      refreshTreeFiles();
    }
  }, [username]);

  return {
    treeFiles,
    isLoading,
    authRequired,
    refreshTreeFiles,
    fetchGoogleDriveTreeFiles
  };
}; 
