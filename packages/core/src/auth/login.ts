
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
        setGlobalAxiosAuthToken(token);
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

