import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

// Cache for Google Drive enabled status
let googleDriveEnabledCache: { value: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute cache

// Cache for file lists
const fileListCache = new Map<string, { 
  files: GoogleDriveFileRow[]; 
  nextPageToken?: string;
  hasMorePages: boolean;
  timestamp: number; 
}>();
const FILE_CACHE_DURATION = 30000; // 30 seconds cache

export const useGoogleDriveFiles = (filePath: string, updates?: number) => {
  const [googleDriveFiles, setGoogleDriveFiles] = useState<GoogleDriveFileRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [hasMorePages, setHasMorePages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [folderIdMap, setFolderIdMap] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  const { showAlert } = useAlert();
  const { username } = useAuth();
  
  // Use refs to track the current operation and prevent race conditions
  const currentOperationRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const isGoogleDrivePath = useMemo(() => 
    filePath.includes('Core/GoogleDrive') || filePath === 'GoogleDrive', 
    [filePath]
  );

  // Helper function to extract folder ID from path
  const extractFolderId = useCallback((path: string): string | undefined => {
    if (!path.includes('Core/GoogleDrive') && path !== 'GoogleDrive') {
      return undefined;
    }
    
    const pathParts = path.split('/');
    const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
    
    if (googleDriveIndex === -1 || googleDriveIndex === pathParts.length - 1) {
      return undefined; // Root Google Drive folder
    }
    
    // Get the folder path after GoogleDrive
    const folderPath = pathParts.slice(googleDriveIndex + 1).join('/');
    return folderIdMap.get(folderPath);
  }, [folderIdMap]);

  // Cached function to check if Google Drive is enabled
  const checkGoogleDriveEnabled = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    
    // Return cached value if still valid
    if (googleDriveEnabledCache && (now - googleDriveEnabledCache.timestamp) < CACHE_DURATION) {
      return googleDriveEnabledCache.value;
    }

    try {
      const isEnabled = await banbury.settings.isGoogleDriveEnabled();
      googleDriveEnabledCache = { value: isEnabled, timestamp: now };
      return isEnabled;
    } catch (error) {
      console.error('Error checking Google Drive status:', error);
      return false;
    }
  }, []);

  // Async file transformation function (runs in a micro-task)
  const transformFiles = useCallback(async (files: any[], currentFilePath: string): Promise<GoogleDriveFileRow[]> => {
    return new Promise((resolve) => {
      // Use setTimeout to yield control back to the main thread
      setTimeout(() => {
        const transformedFiles: GoogleDriveFileRow[] = files.map((file) => {
          // Create proper file path based on current location
          let googleDriveFilePath = '';
          if (currentFilePath === 'Core/GoogleDrive' || currentFilePath === 'GoogleDrive') {
            googleDriveFilePath = `Core/GoogleDrive/${file.file_name}`;
          } else {
            googleDriveFilePath = `${currentFilePath}/${file.file_name}`;
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

        resolve(transformedFiles);
      }, 0);
    });
  }, []);

  // Update folder ID mapping asynchronously
  const updateFolderIdMap = useCallback(async (files: GoogleDriveFileRow[], currentFilePath: string) => {
    setTimeout(() => {
      if (!mountedRef.current) return;
      
      setFolderIdMap(prev => {
        const newMap = new Map(prev);
        files.forEach(file => {
          if (file.kind === 'Folder') {
            const pathParts = file.file_path.split('/');
            const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
            if (googleDriveIndex !== -1 && googleDriveIndex < pathParts.length - 1) {
              const folderPath = pathParts.slice(googleDriveIndex + 1).join('/');
              newMap.set(folderPath, file.id);
            }
          }
        });
        return newMap;
      });
    }, 0);
  }, []);

  // Main fetch function with improved async handling
  const fetchGoogleDriveFiles = useCallback(async (
    pageToken?: string, 
    isLoadMore: boolean = false
  ): Promise<void> => {
    if (!isGoogleDrivePath || !username) {
      setGoogleDriveFiles([]);
      setAuthRequired(false);
      setNextPageToken(undefined);
      setHasMorePages(false);
      setError(null);
      return;
    }

    // Cancel any existing operation
    if (currentOperationRef.current) {
      currentOperationRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    currentOperationRef.current = abortController;

    try {
      // Check cache first for initial loads
      if (!pageToken && !isLoadMore) {
        const cacheKey = `${filePath}_${username}`;
        const cached = fileListCache.get(cacheKey);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < FILE_CACHE_DURATION) {
          if (!mountedRef.current) return;
          setGoogleDriveFiles(cached.files);
          setNextPageToken(cached.nextPageToken);
          setHasMorePages(cached.hasMorePages);
          setError(null);
          return;
        }
      }

      // Set loading states
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
        setGoogleDriveFiles([]);
      }

      // Check if operation was cancelled
      if (abortController.signal.aborted || !mountedRef.current) return;

      // Check Google Drive enabled status
      const isGoogleDriveEnabled = await checkGoogleDriveEnabled();
      
      if (abortController.signal.aborted || !mountedRef.current) return;

      if (!isGoogleDriveEnabled) {
        setGoogleDriveFiles([]);
        setIsLoading(false);
        setIsLoadingMore(false);
        setAuthRequired(false);
        setNextPageToken(undefined);
        setHasMorePages(false);
        setError(null);
        return;
      }

      // Extract folder ID from path for subfolder navigation
      const folderId = extractFolderId(filePath);

      if (abortController.signal.aborted || !mountedRef.current) return;

      // Fetch files from API
      const result = await listGoogleDriveFiles(pageToken, folderId);
      
      if (abortController.signal.aborted || !mountedRef.current) return;

      // Check if result and result.files exist
      if (!result || !result.files || !Array.isArray(result.files)) {
        if (!mountedRef.current) return;
        if (!isLoadMore) {
          setGoogleDriveFiles([]);
        }
        setNextPageToken(undefined);
        setHasMorePages(false);
        setError('No files found');
        return;
      }

      // Transform files asynchronously to avoid blocking UI
      const transformedFiles = await transformFiles(result.files, filePath);
      
      if (abortController.signal.aborted || !mountedRef.current) return;

      // Update state
      if (isLoadMore) {
        setGoogleDriveFiles(prevFiles => [...prevFiles, ...transformedFiles]);
      } else {
        setGoogleDriveFiles(transformedFiles);
        
        // Cache the results for initial loads
        const cacheKey = `${filePath}_${username}`;
        fileListCache.set(cacheKey, {
          files: transformedFiles,
          nextPageToken: result.nextPageToken,
          hasMorePages: !!result.nextPageToken,
          timestamp: Date.now()
        });
      }

      setNextPageToken(result.nextPageToken);
      setHasMorePages(!!result.nextPageToken);
      setAuthRequired(false);
      setError(null);

      // Update folder ID mapping asynchronously
      await updateFolderIdMap(transformedFiles, filePath);

    } catch (error: any) {
      if (abortController.signal.aborted || !mountedRef.current) return;
      
      console.error('Error fetching Google Drive files:', error);
      
      if (error.response?.status === 401 || error.message === 'GOOGLE_DRIVE_AUTH_REQUIRED') {
        setAuthRequired(true);
        setError('Authentication required');
      } else {
        setError(error.message || 'Failed to load files');
        showAlert(
          'Error Loading Google Drive Files',
          [error.message || 'Unknown error occurred.'],
          'error'
        );
      }
      
      if (!isLoadMore) {
        setGoogleDriveFiles([]);
      }
      setNextPageToken(undefined);
      setHasMorePages(false);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
      currentOperationRef.current = null;
    }
  }, [
    isGoogleDrivePath, 
    username, 
    filePath, 
    extractFolderId, 
    checkGoogleDriveEnabled, 
    transformFiles, 
    updateFolderIdMap, 
    showAlert
  ]);

  // Load more files function
  const loadMoreFiles = useCallback(async () => {
    if (!nextPageToken || isLoadingMore) return;
    await fetchGoogleDriveFiles(nextPageToken, true);
  }, [nextPageToken, isLoadingMore, fetchGoogleDriveFiles]);

  // Refresh files function
  const refreshFiles = useCallback(async () => {
    // Clear cache for this path
    const cacheKey = `${filePath}_${username}`;
    fileListCache.delete(cacheKey);
    
    // Also clear Google Drive enabled cache to force recheck
    googleDriveEnabledCache = null;
    
    await fetchGoogleDriveFiles();
  }, [filePath, username, fetchGoogleDriveFiles]);

  // Navigate to folder function
  const navigateToFolder = useCallback((folderFile: GoogleDriveFileRow, setFilePath: (path: string) => void) => {
    if (folderFile.kind === 'Folder') {
      // Update folder mapping before navigation
      const pathParts = folderFile.file_path.split('/');
      const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
      if (googleDriveIndex !== -1 && googleDriveIndex < pathParts.length - 1) {
        const folderPath = pathParts.slice(googleDriveIndex + 1).join('/');
        setFolderIdMap(prev => {
          const newMap = new Map(prev);
          newMap.set(folderPath, folderFile.id);
          return newMap;
        });
      }
      setFilePath(folderFile.file_path);
    }
  }, []);

  // Effect to fetch files when path or updates change
  useEffect(() => {
    fetchGoogleDriveFiles();
  }, [filePath, updates, fetchGoogleDriveFiles]);

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (currentOperationRef.current) {
        currentOperationRef.current.abort();
      }
    };
  }, []);

  return {
    googleDriveFiles,
    isLoading,
    isGoogleDrivePath,
    authRequired,
    loadMoreFiles,
    hasMorePages,
    isLoadingMore,
    navigateToFolder,
    refreshFiles,
    error
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
