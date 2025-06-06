import axios from 'axios';
import { CONFIG } from '../config';
import { FilesTable } from '../types';

export interface GetSyncFilesResponse {
  files: FilesTable[];
  result?: string;
  message?: string;
}

export async function getSyncFiles(
  global_file_path?: string
): Promise<GetSyncFilesResponse> {
  try {
    const url = `${CONFIG.url}/predictions/get_files_to_sync/`;
    
    // Prepare payload - only include global_file_path if provided
    const payload: any = {};
    if (global_file_path !== undefined && global_file_path !== null) {
      payload.global_file_path = global_file_path;
    }

    const response = await axios.post<GetSyncFilesResponse>(url, payload);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching sync files:', error);
    
    // Return a consistent error response
    return {
      files: [],
      result: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 