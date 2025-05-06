import axios from 'axios';
import { config } from '../config';

/**
 * Interface for login response
 */
interface TokenResponse {
  access: string;
  refresh: string;
  username: string;
  deviceId: string;
  result: string;
}

/**
 * Authenticate a user with the Banbury API
 * @param username The username to authenticate
 * @param password The password to authenticate
 * @returns The response from the authentication endpoint
 */
export async function login(username: string, password: string): Promise<{
  data: TokenResponse;
  status: number;
}> {
  try {

    console.log('url: ', config.url)
    const response = await axios.post<TokenResponse>(
      `${config.url}/authentication/token/`,
      { username, password }
    );
    
    return {
      data: response.data,
      status: response.status
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // Return the error response
      return {
        data: error.response.data as TokenResponse,
        status: error.response.status
      };
    }
    
    // For network errors or other issues, create a custom response
    throw error;
  }
}

/**
 * Refresh an authentication token
 * @param refreshToken The refresh token
 * @returns The new access and refresh tokens
 */
export async function refreshToken(refreshToken: string): Promise<{
  data: TokenResponse;
  status: number;
}> {
  try {
    const response = await axios.post<TokenResponse>(
      `${config.url}authentication/token/refresh/`,
      { refresh: refreshToken }
    );
    
    return {
      data: response.data,
      status: response.status
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        data: error.response.data as TokenResponse,
        status: error.response.status
      };
    }
    
    throw error;
  }
} 