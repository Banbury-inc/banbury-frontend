import axios from 'axios';
import { config } from '../config/config';

/**
 * Deletes a single file from S3 and removes its metadata from the database
 * 
 * @param fileId - The ID of the file to delete
 * @returns Result of the delete operation
 */
export const deleteS3File = async (fileId: string): Promise<any> => {
  try {
    const response = await axios.delete(`${config.url}/files/delete_s3_file/${fileId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting S3 file:', error);
    throw error;
  }
};

/**
 * Deletes multiple files from S3 and removes their metadata from the database
 * 
 * @param fileIds - Array of file IDs to delete
 * @returns Result of the delete operations
 */
export const deleteMultipleS3Files = async (fileIds: string[]): Promise<any> => {
  try {
    const response = await axios.post(`${config.url}/files/delete_multiple_s3_files/`, {
      file_ids: fileIds
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting multiple S3 files:', error);
    throw error;
  }
}; 