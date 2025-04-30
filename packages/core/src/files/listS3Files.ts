import axios from 'axios';
import { config } from '../config/config';

/**
 * Retrieves a list of files stored in S3 for a specific user
 * 
 * @param username - The username whose S3 files to retrieve
 * @returns A list of files stored in S3
 */
export const listS3Files = async (username: string): Promise<any> => {
  try {
    const response = await axios.get(`${config.url}/files/get_s3_files/${username}/`);
    return response.data;
  } catch (error) {
    console.error('Error listing S3 files:', error);
    throw error;
  }
}; 