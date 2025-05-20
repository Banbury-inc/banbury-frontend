export * from './login';

import { refreshToken } from './login';
import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';

/**
 * Initializes the authentication state on app startup
 * - Loads stored tokens
 * - Validates current token
 * - Returns auth status information
 */
export async function initAuthState() {
  try {
    // Load token from storage
    const { token, username } = loadGlobalAxiosAuthToken();
    
    if (!token || !username) {
      return {
        isAuthenticated: false,
      };
    }
    
    // Validate the token
    try {
      const tokenStatus = await refreshToken();
      
      if (tokenStatus.success && tokenStatus.valid) {
        return {
          isAuthenticated: true,
          username,
          refreshed: tokenStatus.refreshed || false,
          devMode: tokenStatus.devMode || false
        };
      } else {
        return {
          isAuthenticated: false,
          message: tokenStatus.message || 'Token validation failed'
        };
      }
    } catch (error) {
      // Token refresh failed with an exception
      return {
        isAuthenticated: false,
        message: error instanceof Error ? error.message : 'Authentication error',
        error
      };
    }
  } catch (error) {
    return {
      isAuthenticated: false,
      message: 'Failed to initialize authentication',
      error
    };
  }
}
