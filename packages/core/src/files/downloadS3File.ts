import axios from 'axios';
import { config } from '../config/config';

/**
 * Downloads a file from S3
 * 
 * @param username - The username requesting the download
 * @param fileId - The ID of the file to download
 * @returns The file content as a blob
 */
export const downloadS3File = async (username: string, fileId: string): Promise<Blob> => {
  try {
    const response = await axios.get(
      `${config.url}/files/download_s3_file/${username}/${fileId}/`, 
      { 
        responseType: 'blob' 
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error downloading S3 file:', error);
    throw error;
  }
};

/**
 * Downloads and saves a file from S3
 * 
 * @param username - The username requesting the download
 * @param fileId - The ID of the file to download
 * @param fileName - The name to save the file as
 */
export const downloadAndSaveS3File = async (
  username: string, 
  fileId: string, 
  fileName: string
): Promise<void> => {
  try {
    const blob = await downloadS3File(username, fileId);
    
    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    
    // Append to the document
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading and saving S3 file:', error);
    throw error;
  }
}; 