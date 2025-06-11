import { shell } from 'electron';
import http from 'http';
import axios from 'axios';
import { config } from '../config/config';
import { Integration } from '../types';
import { loadGlobalAxiosCredentials } from '../middleware/axiosGlobalHeader';

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
        category: 'cloud',
        status: 'installed',
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

/**
 * Get Gmail integration status using existing Google Drive credentials
 * Gmail uses the same Google API credentials as Google Drive
 */
export const getGmailIntegrationStatus = async (): Promise<{
  enabled: boolean;
  configured: boolean;
  clientEmail: string | null;
  needsReauth?: boolean;
}> => {
  try {
    // Check if user has Google Drive credentials (which Gmail can use)
    const { checkGoogleDriveCredentials } = await import('../files/googleDrive');
    const credentialStatus = await checkGoogleDriveCredentials();
    
    const hasCredentials = credentialStatus.hasCredentials;
    
    // If credentials exist, check Gmail API access specifically
    let needsReauth = false;
    if (hasCredentials) {
      try {
        const gmailAccess = await checkGmailApiAccess();
        if (!gmailAccess.hasAccess && gmailAccess.message.includes('scope not granted')) {
          needsReauth = true;
        }
      } catch (error) {
        console.warn('Could not check Gmail API access:', error);
      }
    }
    
    // Try to get user email from localStorage or return a generic message if configured
    let clientEmail: string | null = null;
    try {
      // Try to get stored client email or use placeholder if Google credentials exist
      clientEmail = localStorage.getItem('gmail_client_email') || 
        (hasCredentials ? 'Google Account (using Drive credentials)' : null);
    } catch (error) {
      console.warn('Could not access localStorage for Gmail client email:', error);
      // localStorage not available
      clientEmail = hasCredentials ? 'Google Account (using Drive credentials)' : null;
    }
    
    return {
      enabled: hasCredentials && !needsReauth,
      configured: hasCredentials && !needsReauth,
      clientEmail: clientEmail,
      needsReauth: needsReauth
    };
  } catch (error) {
    console.error('Error getting Gmail integration status:', error);
    return {
      enabled: false,
      configured: false,
      clientEmail: null,
      needsReauth: false
    };
  }
};

/**
 * Enable Gmail integration using existing Google Drive credentials
 */
export const enableGmailIntegration = async (clientEmail?: string): Promise<{ 
  result: string; 
  message?: string;
}> => {
  try {
    // Check if user has Google Drive credentials
    const { checkGoogleDriveCredentials } = await import('../files/googleDrive');
    const credentialStatus = await checkGoogleDriveCredentials();
    
    if (!credentialStatus.hasCredentials) {
      return {
        result: 'error',
        message: 'Google credentials not found. Please configure Google Drive integration first to enable Gmail.'
      };
    }

    // Check Gmail API access specifically
    const gmailAccess = await checkGmailApiAccess();
    if (!gmailAccess.hasAccess) {
      if (gmailAccess.message.includes('scope not granted')) {
        return {
          result: 'error',
          message: 'Gmail scope missing from your Google credentials. Please disable and re-enable Google Drive integration to get Gmail permissions.'
        };
      } else {
        return {
          result: 'error',
          message: `Gmail access unavailable: ${gmailAccess.message}`
        };
      }
    }

    // If a client email is provided, validate and store it
    if (clientEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail)) {
        return {
          result: 'error',
          message: 'Please enter a valid email address'
        };
      }
      
      // Store the client email for reference
      localStorage.setItem('gmail_client_email', clientEmail);
    }
    
    return {
      result: 'success',
      message: 'Gmail integration enabled successfully using your existing Google credentials!'
    };
  } catch (error) {
    console.error('Error enabling Gmail integration:', error);
    return {
      result: 'error',
      message: error instanceof Error ? error.message : 'Failed to enable Gmail integration'
    };
  }
};

/**
 * Disable Gmail integration
 * Note: This only disables Gmail tools, Google credentials remain for Drive
 */
export const disableGmailIntegration = async (): Promise<{ result: string; message?: string }> => {
  try {
    // Remove stored client email (if any)
    localStorage.removeItem('gmail_client_email');
    
    return {
      result: 'success',
      message: 'Gmail integration disabled successfully. Google Drive integration remains active.'
    };
  } catch (error) {
    console.error('Error disabling Gmail integration:', error);
    return {
      result: 'error',
      message: error instanceof Error ? error.message : 'Failed to disable Gmail integration'
    };
  }
};

/**
 * Check if Gmail integration is enabled and configured
 */
export const isGmailEnabled = async (): Promise<boolean> => {
  try {
    const status = await getGmailIntegrationStatus();
    return status.enabled && status.configured;
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    return false;
  }
};

/**
 * Check Gmail API access status through backend
 */
export const checkGmailApiAccess = async (): Promise<{
  hasAccess: boolean;
  message: string;
  email?: string;
}> => {
  try {
    const { token, apiKey } = loadGlobalAxiosCredentials();
    const effectiveApiKey = apiKey || 'dev_key_1';

    const response = await axios.get(`${config.url}/files/gmail/check_access`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-API-Key': effectiveApiKey,
      },
    });

    return {
      hasAccess: response.data.has_access || false,
      message: response.data.message || 'Unknown status',
      email: response.data.email
    };
  } catch (error) {
    console.error('Error checking Gmail API access:', error);
    return {
      hasAccess: false,
      message: error instanceof Error ? error.message : 'Failed to check Gmail access'
    };
  }
}; 
