import { shell } from 'electron';
import http from 'http';
import axios from 'axios';
import { config } from '../config/config';

export interface Integration {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  icon?: string;
  settings?: Record<string, any>;
}

export interface IntegrationsResponse {
  result: string;
  integrations: Integration[];
}

/**
 * Get all available integrations and their status
 */
export const getIntegrations = async (): Promise<IntegrationsResponse> => {
  const googleDriveStatus = await getGoogleDriveIntegrationStatus();
  
  return {
    result: 'success',
    integrations: [
      {
        id: 'google_drive',
        name: 'Google Drive',
        description: 'Access your Google Drive files directly from Banbury',
        enabled: googleDriveStatus.enabled,
        configured: googleDriveStatus.configured,
        icon: 'cloud',
      }
    ]
  };
};

/**
 * Update integration status (enable/disable)
 */
export const updateIntegrationStatus = async (
  integrationId: string,
  enabled: boolean
): Promise<{ result: string; message?: string }> => {
  if (integrationId === 'google_drive') {
    if (enabled) {
      return await enableGoogleDriveIntegration();
    } else {
      return await disableGoogleDriveIntegration();
    }
  }
  
  return {
    result: 'error',
    message: `Unknown integration: ${integrationId}`
  };
};

/**
 * Get Google Drive integration status from database
 */
export const getGoogleDriveIntegrationStatus = async (): Promise<{
  enabled: boolean;
  configured: boolean;
  hasCredentials: boolean;
}> => {
  try {
    // Always check the database for Google Drive credentials
    const { checkGoogleDriveCredentials } = await import('../files/googleDrive');
    const credentialStatus = await checkGoogleDriveCredentials();
    
    const hasCredentials = credentialStatus.hasCredentials;
    
    return {
      enabled: hasCredentials, // If user has credentials, integration can be enabled
      configured: hasCredentials, // If user has credentials, integration is configured
      hasCredentials,
    };
  } catch (error) {
    console.error('Error getting Google Drive integration status:', error);
    return {
      enabled: false,
      configured: false,
      hasCredentials: false,
    };
  }
};

/**
 * Enable Google Drive integration
 */
export const enableGoogleDriveIntegration = async (): Promise<{ 
  result: string; 
  authUrl?: string;
  message?: string;
}> => {
  try {
    // Check current status from database
    const status = await getGoogleDriveIntegrationStatus();
    
    if (status.hasCredentials) {
      // User already has valid credentials from Google OAuth login
      return {
        result: 'success',
        message: 'Google Drive integration enabled successfully! You already have Google Drive access from when you signed in with Google.'
      };
    } else {
      // User needs to authenticate - use the OAuth flow
      return await performGoogleOAuth();
    }
  } catch (error) {
    console.error('Error enabling Google Drive integration:', error);
    throw error;
  }
};

/**
 * Perform Google OAuth using the same flow as Login.tsx
 */
const performGoogleOAuth = async (): Promise<{
  result: string;
  message?: string;
}> => {
  return new Promise((resolve, reject) => {
    (async () => {
      let server: http.Server | null = null;
      let actualPort: number | null = null;

      try {
        // Create a simple HTTP server to handle the OAuth callback (same as Login.tsx)
        const createCallbackServer = (port: number): Promise<http.Server> => {
          return new Promise((serverResolve, serverReject) => {
            const serverInstance = http.createServer(async (req, res) => {
              // Set CORS headers
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
              res.setHeader('Content-Type', 'text/html');

              if (req.url?.includes('/files/google_drive/oauth_callback')) {
                const url = new URL(req.url, `http://localhost:${port}`);
                const code = url.searchParams.get('code');

                if (code) {
                  try {
                    // Get authentication credentials properly
                    const { token, apiKey } = await import('../middleware/axiosGlobalHeader').then(m => m.loadGlobalAxiosCredentials());
                    const effectiveApiKey = apiKey || 'dev_key_1';
                    
                    // Call our backend's Google Drive OAuth callback endpoint
                    const response = await axios.get(`${config.url}/files/google_drive/oauth_callback/`, {
                      params: { code },
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-API-Key': effectiveApiKey,
                      },
                    });
                    
                    if (response.data.success) {
                      // Store success flag for polling
                      localStorage.setItem('googleDriveAuthSuccess', 'true');

                      // Send success response
                      res.writeHead(200);
                      res.end(`
                        <html>
                          <head><title>Google Drive Authentication Successful</title></head>
                          <body>
                            <h1>Google Drive Integration Enabled!</h1>
                            <p>You can now close this window.</p>
                            <script>
                              setTimeout(() => {
                                window.close();
                              }, 2000);
                            </script>
                          </body>
                        </html>
                      `);
                    } else {
                      localStorage.setItem('googleDriveAuthError', response.data.error || 'Authentication failed');
                      throw new Error(response.data.error || 'Authentication failed');
                    }
                  } catch (error: any) {
                    console.error('Google Drive OAuth Callback Error:', error);
                    localStorage.setItem('googleDriveAuthError', error.message || 'Authentication failed');
                    
                    res.writeHead(500);
                    res.end(`
                      <html>
                        <head><title>Google Drive Authentication Failed</title></head>
                        <body>
                          <h1>Authentication Failed</h1>
                          <p>${error.message || 'Please try again.'}</p>
                          <script>
                            setTimeout(() => {
                              window.close();
                            }, 3000);
                          </script>
                        </body>
                      </html>
                    `);
                  }
                } else {
                  localStorage.setItem('googleDriveAuthError', 'No authorization code received');
                  res.writeHead(400);
                  res.end(`
                    <html>
                      <head><title>Google Drive Authentication Error</title></head>
                      <body>
                        <h1>Authentication Error</h1>
                        <p>No authorization code received.</p>
                        <script>
                          setTimeout(() => {
                            window.close();
                          }, 3000);
                        </script>
                      </body>
                    </html>
                  `);
                }

                // Close server after handling request
                setTimeout(() => {
                  if (serverInstance) {
                    serverInstance.close();
                  }
                }, 3000);
              }
            });

            serverInstance.on('error', (err: NodeJS.ErrnoException) => {
              if (err.code === 'EADDRINUSE') {
                serverReject(new Error(`Port ${port} is in use`));
              } else {
                serverReject(err);
              }
            });

            serverInstance.listen(port, () => {
              actualPort = port;
              server = serverInstance;
              serverResolve(serverInstance);
            });
          });
        };

        // Try to start server on port 3000 (or fallback ports) - same as Login.tsx
        const ports = [3000, 3001, 3002];
        let serverStarted = false;

        for (const port of ports) {
          try {
            await createCallbackServer(port);
            serverStarted = true;
            actualPort = port;
            break;
          } catch (err) {
            console.error(err);
            continue;
          }
        }

        if (!serverStarted || !actualPort) {
          throw new Error('Failed to start callback server on any available port.');
        }

        // Get the Google auth URL with the correct redirect URI
        const redirectUri = `http://localhost:${actualPort}/files/google_drive/oauth_callback`;
        const response = await axios.get(`${config.url}/authentication/google/`, {
          params: { redirect_uri: redirectUri }
        });
        const authUrl = response.data.authUrl;
        
        // Open the auth URL in the default browser (same as Login.tsx)
        await shell.openExternal(authUrl);

        // Poll for authentication result (same pattern as Login.tsx)
        const pollForResult = () => {
          return new Promise<void>((pollResolve, pollReject) => {
            const checkInterval = setInterval(() => {
              const authSuccess = localStorage.getItem('googleDriveAuthSuccess');
              const authError = localStorage.getItem('googleDriveAuthError');
              
              if (authSuccess === 'true') {
                clearInterval(checkInterval);
                
                // Clean up temporary flags
                localStorage.removeItem('googleDriveAuthSuccess');
                localStorage.removeItem('googleDriveAuthError');
                
                pollResolve();
              } else if (authError) {
                clearInterval(checkInterval);
                
                // Clean up
                localStorage.removeItem('googleDriveAuthSuccess');
                localStorage.removeItem('googleDriveAuthError');
                
                pollReject(new Error(authError));
              }
            }, 1000); // Check every second

            // Timeout after 5 minutes
            setTimeout(() => {
              clearInterval(checkInterval);
              
              // Clean up
              localStorage.removeItem('googleDriveAuthSuccess');
              localStorage.removeItem('googleDriveAuthError');
              
              pollReject(new Error('Authentication timeout'));
            }, 300000);
          });
        };

        // Wait for authentication to complete
        await pollForResult();
        
        resolve({
          result: 'success',
          message: 'Google Drive integration enabled successfully'
        });

      } catch (error: any) {
        console.error('Google Drive OAuth error:', error);
        
        if (error.message.includes('Failed to start callback server')) {
          reject(new Error('Failed to start authentication server. Please try again.'));
        } else if (error.message === 'Authentication timeout') {
          reject(new Error('Authentication timed out. Please try again.'));
        } else {
          reject(new Error('Google Drive authentication failed. Please try again.'));
        }
      } finally {
        // Clean up server
        if (server) {
          (server as http.Server).close();
        }
      }
    })().catch(reject);
  });
};

/**
 * Disable Google Drive integration
 */
export const disableGoogleDriveIntegration = async (): Promise<{ result: string }> => {
  try {
    // Get authentication credentials
    const { token, apiKey } = await import('../middleware/axiosGlobalHeader').then(m => m.loadGlobalAxiosCredentials());
    const effectiveApiKey = apiKey || 'dev_key_1';
    
    // Call backend to remove Google Drive credentials
    const response = await axios.delete(
      `${config.url}/files/google_drive/remove_credentials/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': effectiveApiKey,
        },
      }
    );

    if (response.data.result === 'success') {
      return {
        result: 'success'
      };
    } else {
      throw new Error(response.data.message || 'Failed to disable Google Drive integration');
    }
  } catch (error) {
    console.error('Error disabling Google Drive integration:', error);
    throw error;
  }
};

/**
 * Check if Google Drive integration is enabled and configured
 */
export const isGoogleDriveEnabled = async (): Promise<boolean> => {
  try {
    const status = await getGoogleDriveIntegrationStatus();
    return status.enabled && status.configured;
  } catch (error) {
    console.error('Error checking Google Drive status:', error);
    return false;
  }
}; 
