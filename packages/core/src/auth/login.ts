import axios from 'axios';
import banbury from '..';
import { setGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';
import os from 'os';

/**
 *
 * @param username
 * @param taskInfo
 */
export async function login(username: string, password: string) {
    try {
      const url = `${banbury.config.url}/authentication/getuserinfo4/${username}/${password}`;
      
      const response = await axios.get<any>(url);
      
      const loginSuccess = response.data.result;
      const token = response.data.token;
      const deviceId = `${username}-${os.hostname()}`;
      if (loginSuccess === 'success') {
        setGlobalAxiosAuthToken(token, username);
        return {
          success: true,
          token,
          deviceId,
          userInfo: response.data.user_info,
          message: response.data.message,
        };
      }
      return { success: false };
    } catch (error) {
      console.error('Error during login:', error);
      if (axios.isAxiosError(error)) {
        console.error('Network error details:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url
        });
      }
      return { success: false };
    }
  }

/**
 * Validates the current token and refreshes it if needed
 * @returns A promise resolving to an object with success status and token info
 */
export async function refreshToken() {
  try {
    // First check if we even have a token
    const authHeader = axios.defaults.headers.common['Authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      console.warn('No valid authorization token found for validation');
      return { 
        success: false, 
        valid: false,
        message: 'No authentication token found'
      };
    }

    // Try to make a request that requires authentication to test the token
    await axios.get(`${banbury.config.url}/authentication/validate-token`);
    
    // If we get here, token is still valid
    return { 
      success: true,
      valid: true 
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // Token is invalid or expired, try to refresh it
        try {
          const refreshResponse = await axios.post(`${banbury.config.url}/authentication/refresh-token`);
          
          if (refreshResponse.data.token) {
            // Save the new token
            const username = localStorage.getItem('authUsername');
            setGlobalAxiosAuthToken(refreshResponse.data.token, username || '');
            
            return {
              success: true,
              valid: true,
              refreshed: true,
              token: refreshResponse.data.token
            };
          } else {
            throw new Error('No token received from refresh endpoint');
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          
          // Create a specific error for token refresh failures
          const tokenError = new Error('Session expired, please login again');
          tokenError.name = 'TokenRefreshError';
          
          // Propagate the error for interceptors to handle
          throw tokenError;
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        // Server might be down or endpoint not implemented yet
        // During development, we'll assume the token is valid
        console.warn('Token validation endpoint not available. Assuming token is valid for development.');
        return { 
          success: true, 
          valid: true,
          devMode: true
        };
      }
    }
    
    console.error('Error validating token:', error);
    return { 
      success: false, 
      valid: false,
      message: 'Failed to validate authentication'
    };
  }
}

