import axios from 'axios';
import { CONFIG } from '../config';

export async function removeFiles(
  device_name: string,
  filesInfo: any
): Promise<'success' | 'failed' | 'device not found' | 'invalid files format' | 'no files to delete' | 'no files were deleted' | 'network error' | string> {


  try {
    const response = await axios.post<{
      result: string;
      message?: string;
    }>(`${CONFIG.url}/files/delete_files/`, {
      files: filesInfo,
      device_name: device_name,
    });

    const result = response.data.result;
    if (result === 'success') {
      return 'success';
    } else if (result === 'fail') {
      return 'failed';
    } else if (result === 'device_not_found') {
      return 'device not found';
    } else if (result === 'object_id_not_found' || result === 'device_id_not_found') {
      return 'device not found';
    } else if (result === 'invalid_files') {
      return 'invalid files format';
    } else if (result === 'no_files_to_delete') {
      return 'no files to delete';
    } else if (result === 'no_files_deleted') {
      return 'no files were deleted';
    } else if (result === 'error') {
      return `server error: ${response.data.message || 'unknown error'}`;
    } else {
      return `unexpected response: ${result}`;
    }
  } catch (error) {
    console.error('Error removing files:', error);
    return 'network error';
  }
}
