import { CONFIG } from '../config';
import axios from 'axios';
import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';

/**
 * Get the profile picture URL for a given username
 * @returns The full URL to the user's profile picture, or empty string if no picture
 */
export async function getProfilePictureUrl(): Promise<string> {
  try {
    const { token } = loadGlobalAxiosAuthToken();
    const response = await axios.get(`${CONFIG.url}/users/get_profile_picture/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob'
    });

    if (response.status === 200 && response.data.size > 0) {
      // Create blob URL for the image
      return URL.createObjectURL(response.data);
    }
    return '';
  } catch (error) {
    // Handle 400/404 status (no picture, user not found, etc.)
    if (axios.isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 404)) {
      return ''; // No picture available
    }
    console.error('Error fetching profile picture:', error);
    return '';
  }
}

/**
 * Get the profile picture as a blob/data for a given username
 * @returns Promise that resolves to the profile picture blob or null if error/no picture
 */
export async function getProfilePictureBlob(): Promise<Blob | null> {
  try {
    const { token } = loadGlobalAxiosAuthToken();
    const response = await axios.get(`${CONFIG.url}/users/get_profile_picture/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob'
    });

    if (response.status === 200 && response.data.size > 0) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    // Handle 400/404 status (no picture, user not found, etc.)
    if (axios.isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 404)) {
      return null; // No picture available
    }
    console.error('Error fetching profile picture:', error);
    return null;
  }
} 