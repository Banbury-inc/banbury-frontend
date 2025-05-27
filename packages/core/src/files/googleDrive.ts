import axios from 'axios';
import { config } from '../config/config';
import { loadGlobalAxiosAuthToken, loadGlobalAxiosCredentials } from '../middleware/axiosGlobalHeader';

/**
 * Get authorization headers for API requests
 */
const getAuthHeaders = () => {
  const { token } = loadGlobalAxiosAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export interface GoogleDriveFile {
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
}

export interface GoogleDriveListResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

/**
 * List files from Google Drive
 */
export const listGoogleDriveFiles = async (
  pageToken?: string,
  folderId?: string,
  query?: string
): Promise<GoogleDriveListResponse> => {
  try {
    const params = new URLSearchParams();
    if (pageToken) params.append('page_token', pageToken);
    if (folderId) params.append('folder_id', folderId);
    if (query) params.append('query', query);

    const { token, apiKey } = loadGlobalAxiosCredentials();
    const effectiveApiKey = apiKey || 'dev_key_1';

    const response = await axios.get(
      `${config.url}/files/google_drive/list_files/?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': effectiveApiKey,
        },
      }
    );

    // Check if the response has the expected structure
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid response from Google Drive API');
    }

    // Check for error responses from the backend
    if (response.data.error) {
      if (response.data.error.includes('Drive service not available')) {
        throw new Error('GOOGLE_DRIVE_AUTH_REQUIRED');
      }
      throw new Error(response.data.error);
    }

    // Ensure files array exists
    if (!response.data.files || !Array.isArray(response.data.files)) {
      console.warn('No files array in response:', response.data);
      return { files: [], nextPageToken: response.data.nextPageToken };
    }

    return response.data;
  } catch (error) {
    console.error('Error listing Google Drive files:', error);
    throw error;
  }
};

/**
 * Download a file from Google Drive
 */
export const downloadGoogleDriveFile = async (fileId: string): Promise<Blob> => {
  try {
    const { token, apiKey } = loadGlobalAxiosCredentials();
    const effectiveApiKey = apiKey || 'dev_key_1';
    
    const response = await axios.get(
      `${config.url}/files/google_drive/download_file/${fileId}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': effectiveApiKey,
        },
        responseType: 'blob',
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error downloading Google Drive file:', error);
    throw error;
  }
};

/**
 * Upload a file to Google Drive
 */
export const uploadToGoogleDrive = async (
  file: File,
  parentFolderId?: string
): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (parentFolderId) {
      formData.append('parent_folder_id', parentFolderId);
    }

    const { token, apiKey } = loadGlobalAxiosCredentials();
    const effectiveApiKey = apiKey || 'dev_key_1';
    
    const response = await axios.post(
      `${config.url}/files/google_drive/upload_file/`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': effectiveApiKey,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw error;
  }
};

/**
 * Create a new file in Google Drive with content
 */
export const createGoogleDriveFile = async (
  filename: string,
  content: string,
  mimeType: string = 'text/plain',
  parentFolderId?: string
): Promise<any> => {
  try {
    const requestBody = {
      filename,
      content,
      mime_type: mimeType,
      ...(parentFolderId && { parent_folder_id: parentFolderId })
    };

    const { token, apiKey } = loadGlobalAxiosCredentials();
    const effectiveApiKey = apiKey || 'dev_key_1';

    const response = await axios.post(
      `${config.url}/files/google_drive/create_file/`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': effectiveApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error creating Google Drive file:', error);
    throw error;
  }
};

/**
 * Update an existing file in Google Drive
 */
export const updateGoogleDriveFile = async (
  fileId: string,
  content?: string,
  filename?: string
): Promise<any> => {
  try {
    const requestBody: any = {};
    if (content !== undefined) requestBody.content = content;
    if (filename !== undefined) requestBody.filename = filename;

    const { token, apiKey } = loadGlobalAxiosCredentials();
    const effectiveApiKey = apiKey || 'dev_key_1';

    const response = await axios.put(
      `${config.url}/files/google_drive/update_file/${fileId}/`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': effectiveApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error updating Google Drive file:', error);
    throw error;
  }
};

/**
 * Delete a file from Google Drive
 */
export const deleteGoogleDriveFile = async (fileId: string): Promise<any> => {
  try {
    const { token, apiKey } = loadGlobalAxiosCredentials();
    const effectiveApiKey = apiKey || 'dev_key_1';

    const response = await axios.delete(
      `${config.url}/files/google_drive/delete_file/${fileId}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': effectiveApiKey,
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error deleting Google Drive file:', error);
    throw error;
  }
};

/**
 * Save a Google Drive file to local BCloud directory
 */
export const saveGoogleDriveFileToLocal = async (
  fileId: string,
  _fileName: string
): Promise<string> => {
  try {
    // Download the file content
    const blob = await downloadGoogleDriveFile(fileId);
    
    // For Electron app, we'll need to save to the BCloud directory
    // This would require Electron-specific file system access
    const arrayBuffer = await blob.arrayBuffer();
    const _buffer = Buffer.from(arrayBuffer);
    
    // Return success (actual file saving would be handled by Electron main process)
    return 'success';
  } catch (error) {
    console.error('Error saving Google Drive file to local:', error);
    throw error;
  }
}; 