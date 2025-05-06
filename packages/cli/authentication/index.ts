import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { banbury } from '@banbury/core';

interface TokenResponse {
  access: string;
  refresh: string;
  username: string;
  deviceId: string;
  result: string;
}


/**
 * Authenticate a user and save JWT tokens
 */
export async function login(username: string, password: string): Promise<string> {
  try {
    // Create the config directory if it doesn't exist
    const configDir = path.join(os.homedir(), '.banbury');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Use the core authentication module
    const response = await banbury.auth.login(username, password);

    if (response.status === 200 && response.data.result === 'success') {
      // Save the token information
      const authConfig = {
        username: response.data.username,
        deviceId: response.data.deviceId,
        access_token: response.data.access,
        refresh_token: response.data.refresh,
        token_timestamp: Date.now(),
        api_url: banbury.config.url
      };

      fs.writeFileSync(
        path.join(configDir, 'auth.json'),
        JSON.stringify(authConfig, null, 2)
      );

      return `Successfully logged in as ${response.data.username}`;
    } else {
      return 'Login failed';
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return `Login failed: ${
        error.response.data.error || error.message || 'Unknown error'
      }`;
    }
    return `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Get the stored authentication configuration
 */
export function getAuthConfig(): {
  username?: string;
  deviceId?: string;
  access_token?: string;
  refresh_token?: string;
  token_timestamp?: number;
  api_url?: string;
} {
  try {
    const configPath = path.join(os.homedir(), '.banbury', 'auth.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config;
    }
  } catch (error) {
    console.error('Error reading auth config:', error);
  }
  return {};
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshToken(): Promise<boolean> {
  const authConfig = getAuthConfig();
  
  if (!authConfig.refresh_token) {
    return false;
  }
  
  try {
    // Use the core authentication module
    const response = await banbury.auth.refreshToken(authConfig.refresh_token);
    
    if (response.data.result === 'success') {
      // Update the tokens in the config file
      const updatedConfig = {
        ...authConfig,
        access_token: response.data.access,
        refresh_token: response.data.refresh,
        token_timestamp: Date.now()
      };
      
      fs.writeFileSync(
        path.join(os.homedir(), '.banbury', 'auth.json'),
        JSON.stringify(updatedConfig, null, 2)
      );
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

/**
 * Get an authentication header with the access token
 * Automatically attempts to refresh if needed
 */
export async function getAuthHeaderWithRefresh(): Promise<{ Authorization?: string }> {
  let authConfig = getAuthConfig();
  
  if (!authConfig.access_token) {
    return {};
  }
  
  // Check if token might be expired (30 min default for JWT)
  const tokenAge = Date.now() - (authConfig.token_timestamp || 0);
  const TOKEN_EXPIRY = 29 * 60 * 1000; // 29 minutes in milliseconds
  
  if (tokenAge > TOKEN_EXPIRY) {
    // Try to refresh the token
    const refreshSuccess = await refreshToken();
    if (refreshSuccess) {
      authConfig = getAuthConfig(); // Get updated config
    } else {
      return {}; // Return empty if refresh failed
    }
  }
  
  return { Authorization: `Bearer ${authConfig.access_token}` };
}

/**
 * Get an authentication header with the access token
 */
export function getAuthHeader(): { Authorization?: string } {
  const authConfig = getAuthConfig();
  if (authConfig.access_token) {
    return { Authorization: `Bearer ${authConfig.access_token}` };
  }
  return {};
}

/**
 * Get detailed authentication status
 */
export function getAuthStatus(): { 
  loggedIn: boolean; 
  username?: string; 
  deviceId?: string; 
  tokenExpiry?: string;
  apiUrl?: string;
} {
  const authConfig = getAuthConfig();
  const loggedIn = !!authConfig.access_token;
  
  if (!loggedIn) {
    return { loggedIn };
  }
  
  // Calculate token expiry time
  const tokenTimestamp = authConfig.token_timestamp || 0;
  const tokenAge = Date.now() - tokenTimestamp;
  const TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds
  const timeRemaining = Math.max(0, TOKEN_EXPIRY - tokenAge);
  const minutesRemaining = Math.floor(timeRemaining / (60 * 1000));
  
  return {
    loggedIn,
    username: authConfig.username,
    deviceId: authConfig.deviceId,
    tokenExpiry: minutesRemaining > 0 ? `${minutesRemaining} minutes` : 'Expired',
    apiUrl: authConfig.api_url || banbury.config.url
  };
}

/**
 * Check if the user is logged in
 */
export function isLoggedIn(): boolean {
  const authConfig = getAuthConfig();
  return !!authConfig.access_token;
}

/**
 * Logout the user by removing saved tokens
 */
export function logout(): string {
  try {
    const configPath = path.join(os.homedir(), '.banbury', 'auth.json');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      return 'Successfully logged out';
    }
    return 'Not logged in';
  } catch (error) {
    return `Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
