
import axios from 'axios';
import { CONFIG } from '../config';
import banbury from '..';
import { setGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';

/**
 *
 * @param username
 * @param taskInfo
 */
export async function login(username: string, password: string) {
    try {
      const url = `${banbury.config.url}/authentication/getuserinfo4/${username}/${password}`;
      
      const response = await axios.get<any>(url);
      
      const result = response.data.result;
      const token = response.data.token;
      if (result === 'success') {
        setGlobalAxiosAuthToken(token);
        return {
          response,
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

