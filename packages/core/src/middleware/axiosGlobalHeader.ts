import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { refreshToken } from '../auth/login';

const BANBURY_DIR = path.join(os.homedir(), '.banbury');
if (!fs.existsSync(BANBURY_DIR)) {
  fs.mkdirSync(BANBURY_DIR, { recursive: true, mode: 0o700 });
}
const TOKEN_FILE = path.join(BANBURY_DIR, 'token');
const USERNAME_FILE = path.join(BANBURY_DIR, 'username');
const API_KEY_FILE = path.join(BANBURY_DIR, 'api_key');

// Set a default (empty) Authorization header
axios.defaults.headers.common['Authorization'] = '';
// Set a default (empty) API Key header
axios.defaults.headers.common['X-API-Key'] = '';

// Track if a token refresh is in progress
let isRefreshing = false;
// Store pending requests that should be retried after token refresh
let pendingRequests: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
  config: any;
}> = [];

/**
 * Sets a custom global Authorization header for all axios requests and saves it to disk.
 * @param token - The authentication token
 * @param username - The username associated with the token
 */
export function setGlobalAxiosAuthToken(token: string, username?: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  try {
    fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
    
    // Save username if provided
    if (username) {
      fs.writeFileSync(USERNAME_FILE, username, { mode: 0o600 });
    }
  } catch (err) {
    console.error('Failed to save token:', err);
  }
}

/**
 * Sets a custom global API Key header for all axios requests and saves it to disk.
 * @param apiKey - The API key for authentication
 */
export function setGlobalAxiosApiKey(apiKey: string) {
  axios.defaults.headers.common['X-API-Key'] = apiKey;
  try {
    fs.writeFileSync(API_KEY_FILE, apiKey, { mode: 0o600 });
  } catch (err) {
    console.error('Failed to save API key:', err);
  }
}

/**
 * Loads the token from disk and sets it as the global Authorization header.
 * @returns The username associated with the token if available
 */
export function loadGlobalAxiosAuthToken(): { token?: string, username?: string } {
  try {
    let token: string | undefined;
    let username: string | undefined;
    
    if (fs.existsSync(TOKEN_FILE)) {
      token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }
    
    if (fs.existsSync(USERNAME_FILE)) {
      username = fs.readFileSync(USERNAME_FILE, 'utf8').trim();
    }
    
    return { token, username };
  } catch (err) {
    console.error('Failed to load token:', err);
    return {};
  }
}

/**
 * Loads the API key from disk and sets it as the global X-API-Key header.
 * @returns The API key if available
 */
export function loadGlobalAxiosApiKey(): { apiKey?: string } {
  try {
    let apiKey: string | undefined;
    
    if (fs.existsSync(API_KEY_FILE)) {
      apiKey = fs.readFileSync(API_KEY_FILE, 'utf8').trim();
      if (apiKey) {
        axios.defaults.headers.common['X-API-Key'] = apiKey;
      }
    }
    
    return { apiKey };
  } catch (err) {
    console.error('Failed to load API key:', err);
    return {};
  }
}

/**
 * Loads both the auth token and API key from disk
 */
export function loadGlobalAxiosCredentials(): { token?: string, username?: string, apiKey?: string } {
  const { token, username } = loadGlobalAxiosAuthToken();
  const { apiKey } = loadGlobalAxiosApiKey();
  return { token, username, apiKey };
}

/**
 * Process all pending requests after token refresh
 */
function processQueue(error: any, token: string | null = null) {
  pendingRequests.forEach(request => {
    if (error) {
      request.reject(error);
    } else if (token) {
      // Add the new token to the request's Authorization header
      request.config.headers.Authorization = `Bearer ${token}`;
      // Retry the request with the new token
      axios(request.config).then(
        response => request.resolve(response),
        error => request.reject(error)
      );
    }
  });
  
  // Reset the queue
  pendingRequests = [];
}

// Add a response interceptor to handle token refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If the error is 401 Unauthorized and it's not a token refresh request itself
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url.includes('refresh-token') &&
        !originalRequest.url.includes('login')) {
      
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          // Attempt to refresh the token
          const refreshResult = await refreshToken();
          
          if (refreshResult.success && refreshResult.token) {
            // Use the new token for future requests
            localStorage.getItem('authUsername');
            
            // Set the new token for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${refreshResult.token}`;
            
            // Mark the current request as retried
            originalRequest._retry = true;
            originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
            
            // Process any pending requests with the new token
            processQueue(null, refreshResult.token);
            
            // Retry the original request with the new token
            return axios(originalRequest);
          } else {
            // Token refresh failed, clear auth and reject all pending requests
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUsername');
            
            // Signal client code to redirect to login
            const tokenError = new Error('Token refresh failed');
            tokenError.name = 'TokenRefreshError';
            
            processQueue(tokenError);
            
            throw tokenError;
          }
        } catch (refreshError) {
          // Token refresh failed
          processQueue(refreshError);
          throw refreshError;
        } finally {
          isRefreshing = false;
        }
      } else {
        // If token refresh is already in progress, add the request to the queue
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve,
            reject,
            config: originalRequest
          });
        });
      }
    }
    
    // For all other errors, just reject the promise
    return Promise.reject(error);
  }
);

export function clearBanburyCredentials() {
  try {
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
    if (fs.existsSync(USERNAME_FILE)) fs.unlinkSync(USERNAME_FILE);
    if (fs.existsSync(API_KEY_FILE)) fs.unlinkSync(API_KEY_FILE);
  } catch (err) {
    console.error('Failed to clear .banbury credentials:', err);
  }
} 
