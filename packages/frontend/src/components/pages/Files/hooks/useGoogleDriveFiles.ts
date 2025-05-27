import { useState, useEffect } from 'react';
import { useAuth } from '../../../../renderer/context/AuthContext';
import { useAlert } from '../../../../renderer/context/AlertContext';
import { listGoogleDriveFiles } from '@banbury/core/src/files/googleDrive';

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

export const useGoogleDriveFiles = (filePath: string, filePathDevice: string) => {
  const [googleDriveFiles, setGoogleDriveFiles] = useState<GoogleDriveFileRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const { showAlert } = useAlert();
  const { username } = useAuth();

  const isGoogleDrivePath = filePath.includes('Core/GoogleDrive') || filePath === 'GoogleDrive';

  // Helper function to extract folder ID from path
  const extractFolderId = (path: string): string | undefined => {
    // For now, return undefined for root folder
    // In a full implementation, you'd want to store folder IDs
    if (path === 'Core/GoogleDrive' || path === 'GoogleDrive') {
      return undefined;
    }
    // TODO: Implement folder ID mapping for subfolder navigation
    return undefined;
  };

  useEffect(() => {
    if (!isGoogleDrivePath || !username) {
      setGoogleDriveFiles([]);
      setAuthRequired(false);
      return;
    }

    const fetchGoogleDriveFiles = async () => {
      try {
        setIsLoading(true);
        setAuthRequired(false);
        
        // Extract folder ID from path for subfolder navigation
        const folderId = extractFolderId(filePath);

        const result = await listGoogleDriveFiles(undefined, folderId);
        
        // Check if result and result.files exist
        if (!result || !result.files || !Array.isArray(result.files)) {
          console.warn('Invalid response from Google Drive API:', result);
          setGoogleDriveFiles([]);
          return;
        }
        
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoogleDriveFiles();
  }, [filePath, filePathDevice, username, isGoogleDrivePath, showAlert]);

  const refreshFiles = async () => {
    if (!isGoogleDrivePath || !username) return;
    
    try {
      setIsLoading(true);
      const folderId = extractFolderId(filePath);
      const result = await listGoogleDriveFiles(undefined, folderId);
      
      // Check if result and result.files exist
      if (!result || !result.files || !Array.isArray(result.files)) {
        console.warn('Invalid response from Google Drive API:', result);
        setGoogleDriveFiles([]);
        return;
      }
      
      const transformedFiles: GoogleDriveFileRow[] = result.files.map((file) => {
        let googleDriveFilePath = '';
        if (filePath === 'Core/GoogleDrive' || filePath === 'GoogleDrive') {
          googleDriveFilePath = `Core/GoogleDrive/${file.file_name}`;
        } else {
          googleDriveFilePath = `${filePath}/${file.file_name}`;
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
      console.error('Error refreshing Google Drive files:', error);
      if (error.response?.status === 401) {
        setAuthRequired(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    googleDriveFiles,
    isLoading: isGoogleDrivePath ? isLoading : false,
    isGoogleDrivePath,
    authRequired,
    refreshFiles
  };
}; 