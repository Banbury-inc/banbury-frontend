import axios from 'axios';
import { config } from '../config/config';

/**
 * Uploads a file to the S3 bucket
 * 
 * @param username - The username
 * @param file - The file to upload
 * @param deviceName - The device name
 * @param filePath - The file path where the file should be stored
 * @param fileParent - The parent directory of the file
 * @returns Result of the upload operation
 */
export const uploadToS3 = async (
  file: File,
  deviceName: string,
  filePath: string = '',
  fileParent: string = ''
): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('device_name', deviceName);
    formData.append('file_path', filePath);
    formData.append('file_parent', fileParent);

    const response = await axios.post(
      `${config.url}/files/upload_to_s3/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};

/**
 * Uploads multiple files to the S3 bucket
 * 
 * @param username - The username
 * @param files - The files to upload
 * @param deviceName - The device name
 * @param filePath - The file path where the files should be stored
 * @param fileParent - The parent directory of the files
 * @returns Results of the upload operations
 */
export const uploadMultipleToS3 = async (
  files: File[],
  deviceName: string,
  filePath: string = '',
  fileParent: string = ''
): Promise<any[]> => {
  try {
    const uploadPromises = files.map(file => 
      uploadToS3( file, deviceName, filePath, fileParent)
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple files to S3:', error);
    throw error;
  }
}; 
