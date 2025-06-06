import * as React from 'react';
import { useState, useEffect } from 'react';
import NeuraNet_Logo from '/static/NeuraNet_Icons/web/icon-512.png';
import Button from '@mui/material/Button';
import axios from 'axios';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { ThemeProvider } from '@mui/material/styles';
import theme from "../../../renderer/themes/theme";
import Main from "../../pages/main";
import { useAuth } from '../../../renderer/context/AuthContext';
import { Google as GoogleIcon } from '@mui/icons-material';
import { shell } from 'electron';
import banbury from '@banbury/core';
import Onboarding from './components/Onboarding';
import http from 'http';
import os from 'os';
import { initAuthState } from '@banbury/core/src/auth';
import { startPeriodicDeviceInfoProcess } from '@banbury/core/src/device/startPeriodicDeviceInfoProcess';
import { setGlobalAxiosAuthToken } from '@banbury/core/src/middleware/axiosGlobalHeader';
import { Textbox } from '../../common/Textbox/Textbox';
import { Text, TextLink } from '../../common/Text/Text';
import { Checkbox } from '../../common/Checkbox/Checkbox';

interface Message {
  type: string;
  content: string;
}

process.on('uncaughtException', (err: Error & { code?: string }) => {
  switch (err.code) {
    case 'ECONNREFUSED':
      console.error('Connection refused. The server is unreachable.');
      break;
    case 'ETIMEDOUT':
      console.error('Connection timed out.');
      break;
    default:
      console.error('Uncaught error:', err);
      break;
  }
});

function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="https://website2-389236221119.us-central1.run.app">
        Banbury
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

// Singleton pattern to prevent multiple intervals
let deviceInfoProcessStarted = false;
function maybeStartDeviceInfoProcess(username: string, deviceId: string) {
  if (!deviceInfoProcessStarted && username && deviceId) {
    startPeriodicDeviceInfoProcess(deviceId);
    deviceInfoProcessStarted = true;
  }
}

export default function SignIn() {
  // Move ALL hooks to the top of the component
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { setUsername, isTokenRefreshFailed, resetTokenRefreshStatus } = useAuth();
  const [incorrect_login, setincorrect_login] = useState(false);
  const [server_offline, setserver_offline] = useState(false);
  const [showMain, setShowMain] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Messages can be defined after hooks
  const incorrect_login_message: Message = {
    type: 'error',
    content: 'Incorrect username or password',
  };
  const server_offline_message: Message = {
    type: 'error',
    content: 'Server is offline. Please try again later.',
  };
  const session_expired_message: Message = {
    type: 'error',
    content: 'Your session has expired. Please sign in again.',
  };

  // Add effect to handle token refresh failures
  useEffect(() => {
    if (isTokenRefreshFailed) {
      setTokenError(session_expired_message.content);
      resetTokenRefreshStatus();
    }
  }, [isTokenRefreshFailed, resetTokenRefreshStatus]);

  // useEffect hook for auto-login
  useEffect(() => {
    const checkToken = async () => {
      try {
        setLoading(true);
        
        // Check if this is a Google OAuth session
        const isGoogleOAuth = localStorage.getItem('googleOAuthSession') === 'true';
        const authUsername = localStorage.getItem('authUsername');
        const authToken = localStorage.getItem('authToken');
        
        if (isGoogleOAuth && authUsername && authToken) {
          // For Google OAuth, we have a real JWT token, so we can validate it normally
          try {
            // Try to validate the token with the backend
            const response = await axios.get(`${banbury.config.url}/authentication/validate-token/`, {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            });
            
            if (response.data.valid) {
              // Token is valid, proceed with login
              setUsername(authUsername);
              
              // Set up axios headers for authenticated requests
              setGlobalAxiosAuthToken(authToken, authUsername);
              
              // Create deviceId if missing
              const currentDeviceId = localStorage.getItem('deviceId');
              if (!currentDeviceId) {
                localStorage.setItem('deviceId', `${authUsername}-${os.hostname()}`);
              }
              
              // Check onboarding status - use email if available, otherwise username
              const email = localStorage.getItem('authUsername'); // For Google OAuth, this is the email
              const hasCompletedOnboarding = email ? localStorage.getItem(`onboarding_${email}`) : null;
              if (!hasCompletedOnboarding && email) {
                localStorage.setItem('pendingAuthEmail', email);
                setShowOnboarding(true);
                setLoading(false);
                return;
              }
              
              setIsAuthenticated(true);
              setShowMain(true);
              const deviceName = os.hostname();
              if (authUsername) {
                maybeStartDeviceInfoProcess(authUsername, deviceName);
              }
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Google OAuth token validation failed:', error);
            // Only clear the session if we're not in the middle of onboarding
            const pendingAuth = localStorage.getItem('pendingAuthEmail');
            if (!pendingAuth) {
              // Clear the invalid Google OAuth session
              localStorage.removeItem('googleOAuthSession');
              localStorage.removeItem('authToken');
              localStorage.removeItem('authUsername');
              localStorage.removeItem('deviceId');
            } else {
              // Just clear the Google OAuth flag but preserve auth data for onboarding
              localStorage.removeItem('googleOAuthSession');
              console.warn('Token validation failed but preserving auth data for onboarding completion');
            }
          }
        }
        
        // Use the new initAuthState function for regular (non-Google OAuth) sessions
        const authState = await initAuthState();
        
        if (authState.isAuthenticated && authState.username) {
          // Token is valid, proceed with auto-login
          setUsername(authState.username);
          localStorage.setItem('authUsername', authState.username);
          
          // Create deviceId if missing
          const currentDeviceId = localStorage.getItem('deviceId');
          if (!currentDeviceId) {
            localStorage.setItem('deviceId', `${authState.username}-${os.hostname()}`);
          }
          
          const hasCompletedOnboarding = localStorage.getItem(`onboarding_${authState.username}`);
          if (!hasCompletedOnboarding) {
            localStorage.setItem('pendingAuthEmail', authState.username);
            setShowOnboarding(true);
            setLoading(false);
            return; // Don't show main yet
          }
          
          setIsAuthenticated(true);
          setShowMain(true);
          const deviceName = os.hostname();
          maybeStartDeviceInfoProcess(authState.username, deviceName);
        } else {
          // Token validation failed
          if (authState.message) {
            setTokenError(authState.message);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Auto-login error:', error);
        setLoading(false);
      }
    };

    checkToken();
  }, [setUsername, isAuthenticated]);

  // Handle submit function
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setTokenError(null); // Clear any token errors on new login attempt

    try {
      const data = new FormData(event.currentTarget);
      const email = data.get('email') as string;
      const password = data.get('password') as string;

      if (email && password) {
        const result = await banbury.auth.login(email, password);
        if (result.success && result.deviceId && result.token) {
          // Store the actual token, not the email
          localStorage.setItem('authToken', result.token);
          localStorage.setItem('deviceId', result.deviceId);
          localStorage.setItem('authUsername', email);
          
          // Ensure the token is set in axios headers before proceeding
          setGlobalAxiosAuthToken(result.token, email);
          
          // Wait a moment to ensure the token is properly set
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check if this is the user's first login
          const hasCompletedOnboarding = localStorage.getItem(`onboarding_${email}`);
          
          if (!hasCompletedOnboarding) {
            localStorage.setItem('pendingAuthEmail', email);
            setUsername(email);
            setShowOnboarding(true);
          } else {
            setUsername(email);
            setIsAuthenticated(true);
            setShowMain(true);
            maybeStartDeviceInfoProcess(email, result.deviceId);
          }
        } else {
          setincorrect_login(true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setincorrect_login(true);
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleLogin = async () => {
    setLoading(true);
    setTokenError(null);
    setincorrect_login(false);
    setserver_offline(false);

    let actualPort: number | null = null;

    try {
      // Create a simple HTTP server to handle the OAuth callback
      const createCallbackServer = (port: number): Promise<http.Server> => {
        return new Promise((resolve, reject) => {
          const server = http.createServer(async (req, res) => {
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Content-Type', 'text/html');

            if (req.url?.includes('/authentication/auth/callback')) {
              const url = new URL(req.url, `http://localhost:${port}`);
              const code = url.searchParams.get('code');

              if (code) {
                try {
                  // Call our backend's callback endpoint
                  const response = await axios.get(`${banbury.config.url}/authentication/auth/callback?code=${code}`);
                  
                  if (response.data.success && response.data.token) {
                    const userData = response.data.user;
                    const email = userData.email;
                    const username = userData.username;
                    const token = response.data.token;
                    
                    // Store the proper JWT token and authentication data
                    localStorage.setItem('authToken', token);
                    localStorage.setItem('authUsername', username);
                    localStorage.setItem('deviceId', `${username}-${os.hostname()}`);
                    
                    // Set up axios headers for authenticated requests
                    setGlobalAxiosAuthToken(token, username);
                    
                    // Mark this as a Google OAuth session
                    localStorage.setItem('googleOAuthSession', 'true');
                    
                    // Store success flag for polling
                    localStorage.setItem('googleAuthSuccess', 'true');
                    localStorage.setItem('googleAuthEmail', email);
                    localStorage.setItem('googleAuthUsername', username);
                    localStorage.setItem('googleAuthToken', token);

                    // Send success response
                    res.writeHead(200);
                    res.end(`
                      <html>
                        <head><title>Authentication Successful</title></head>
                        <body>
                          <h1>Authentication Successful!</h1>
                          <p>Redirecting back to the application...</p>
                          <script>
                            setTimeout(() => {
                              window.close();
                            }, 2000);
                          </script>
                        </body>
                      </html>
                    `);
                  } else {
                    localStorage.setItem('googleAuthError', response.data.error || 'Authentication failed');
                    throw new Error(response.data.error || 'Authentication failed');
                  }
                } catch (error: any) {
                  console.error('Callback Error:', error);
                  localStorage.setItem('googleAuthError', error.message || 'Authentication failed');
                  
                  res.writeHead(500);
                  res.end(`
                    <html>
                      <head><title>Authentication Failed</title></head>
                      <body>
                        <h1>Authentication Failed</h1>
                        <p>Please try again.</p>
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
                localStorage.setItem('googleAuthError', 'No authorization code received');
                res.writeHead(400);
                res.end(`
                  <html>
                    <head><title>Authentication Error</title></head>
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
                if (server) {
                  server.close();
                }
              }, 3000);
            }
          });

          server.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              reject(new Error(`Port ${port} is in use`));
            } else {
              reject(err);
            }
          });

          server.listen(port, () => {
            actualPort = port;
            resolve(server);
          });
        });
      };

      // Try to start server on port 3000 (or fallback ports)
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
      const redirectUri = `http://localhost:${actualPort}/authentication/auth/callback`;
      const response = await axios.get(`${banbury.config.url}/authentication/google?redirect_uri=${encodeURIComponent(redirectUri)}`);
      const authUrl = response.data.authUrl;
      
      // Open the auth URL in the default browser
      await shell.openExternal(authUrl);

      // Poll for authentication result
      const pollForResult = () => {
        return new Promise<void>((resolve, reject) => {
          const checkInterval = setInterval(() => {
            const authSuccess = localStorage.getItem('googleAuthSuccess');
            const authError = localStorage.getItem('googleAuthError');
            
            if (authSuccess === 'true') {
              clearInterval(checkInterval);
              
              // Get stored auth data
              const email = localStorage.getItem('googleAuthEmail');
              const username = localStorage.getItem('googleAuthUsername');
              const token = localStorage.getItem('googleAuthToken');
              const deviceId = localStorage.getItem('deviceId');
              
              if (email && username && token && deviceId) {
                // Set up axios headers for authenticated requests
                setGlobalAxiosAuthToken(token, username);
                
                // Update component state with username (not email)
                setUsername(username);
                setIsAuthenticated(true);

                // Clear any token errors since this is a valid Google OAuth session
                setTokenError(null);

                // Check onboarding status using email
                const hasCompletedOnboarding = localStorage.getItem(`onboarding_${email}`);
                
                if (!hasCompletedOnboarding) {
                  localStorage.setItem('pendingAuthEmail', email);
                  setShowOnboarding(true);
                } else {
                  setShowMain(true);
                  maybeStartDeviceInfoProcess(username, deviceId);
                }
              }

              // Clean up temporary flags
              localStorage.removeItem('googleAuthSuccess');
              localStorage.removeItem('googleAuthEmail');
              localStorage.removeItem('googleAuthUsername');
              localStorage.removeItem('googleAuthToken');
              localStorage.removeItem('googleAuthError');
              
              resolve();
            } else if (authError) {
              clearInterval(checkInterval);
              
              // Clean up
              localStorage.removeItem('googleAuthSuccess');
              localStorage.removeItem('googleAuthEmail');
              localStorage.removeItem('googleAuthUsername');
              localStorage.removeItem('googleAuthToken');
              localStorage.removeItem('googleAuthError');
              
              reject(new Error(authError));
            }
          }, 1000); // Check every second

          // Timeout after 5 minutes
          setTimeout(() => {
            clearInterval(checkInterval);
            
            // Clean up
            localStorage.removeItem('googleAuthSuccess');
            localStorage.removeItem('googleAuthEmail');
            localStorage.removeItem('googleAuthUsername');
            localStorage.removeItem('googleAuthToken');
            localStorage.removeItem('googleAuthError');
            
            reject(new Error('Authentication timeout'));
          }, 300000);
        });
      };

      // Wait for authentication to complete
      await pollForResult();

    } catch (error: any) {
      console.error('Google auth error:', error);
      if (error.message.includes('Failed to start callback server')) {
        setTokenError('Failed to start authentication server. Please try again.');
      } else if (error.message === 'Authentication timeout') {
        setTokenError('Authentication timed out. Please try again.');
      } else {
        setserver_offline(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Add this function to handle onboarding completion
  const handleOnboardingComplete = () => {
    // Get the email from localStorage if it was stored during login
    const email = localStorage.getItem('pendingAuthEmail');
    
    if (email) {
      setUsername(email);
      
      // Get the actual auth token (should already be set from login)
      const authToken = localStorage.getItem('authToken');
      
      if (authToken) {
        // Ensure the token is set in axios headers
        setGlobalAxiosAuthToken(authToken, email);
        localStorage.setItem(`onboarding_${email}`, 'true'); // Store onboarding completion per user
      } else {
        console.warn('No auth token found during onboarding completion. User may need to re-authenticate.');
        // Instead of failing, we'll still complete onboarding but the user may need to log in again
        // This handles cases where the token was cleared during validation
      }
      
      localStorage.setItem('authUsername', email);
      localStorage.setItem(`onboarding_${email}`, 'true'); // Always mark onboarding as complete
      localStorage.removeItem('pendingAuthEmail'); // Clean up the temporary storage
    }
    
    setShowOnboarding(false); // Explicitly hide onboarding
    setIsAuthenticated(true);
    setShowMain(true);
    const deviceId = localStorage.getItem('deviceId');
    if (typeof email === 'string' && typeof deviceId === 'string') {
      maybeStartDeviceInfoProcess(email, deviceId);
    }
  };

  // Render content based on state
  if (showOnboarding) {
    return <Onboarding 
      onComplete={handleOnboardingComplete} 
    />;
  }

  if (isAuthenticated || showMain) {
    return <Main />;
  }

  // Main render
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Container component="main" maxWidth="xs" sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: 8,
          pb: 4,
          position: 'relative',
          zIndex: 1
        }}>
          <CssBaseline />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%'
            }}
          >
            {/* <Avatar sx={{ mt: 10, bgcolor: 'primary.main' }}> */}

            {/* <LockOutlinedIcon /> */}
            {/* </Avatar> */}
            {/* <img src={NeuraNet_Logo} alt="Logo" style={{ marginTop: 100, marginBottom: 20, width: 157.2, height: 137.2 }} /> */}
            <img src={NeuraNet_Logo} alt="Logo" style={{ marginTop: 100, marginBottom: 20, width: 50, height: 50 }} />
            <Text className="text-2xl font-semibold mb-4 text-center">
              Sign in
            </Text>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>

            <Text className="block font-medium mb-1">
             Username
            </Text>
              <Textbox
                className='w-full mb-4'
                type="email"
                name="email"
                autoComplete="email"
                autoFocus
              />

            <Text className="block font-medium mb-1">
             Password
            </Text>
              <Textbox
                className='w-full mb-2'
                type="password"
                name="password"
                autoComplete="current-password"
              />
              <div className="flex items-center mb-2">
                <Checkbox id="remember" name="remember" className="mr-2" />
                <Text className="text-sm">Remember me</Text>
              </div>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 1 }}
                // onClick={handleClick}
                disabled={loading} // Disable the button while loading
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>

              <Text className="text-sm text-center mb-2 mt-2">
                - OR -
              </Text>


              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                sx={{ mt: 1, mb: 2 }}
                disabled={loading}
              >
                Sign in with Google
              </Button>
              <Grid container>
                <Grid item xs>
                  {/* <Link href="/register" variant="body2"> */}
                  <TextLink href="/register" className="text-sm text-center mb-2 mt-2" onClick={() => {
                    // setredirect_to_register(true);
                  }}>
                    Forgot password?
                  </TextLink>
                </Grid>
                <Grid item>
                  <TextLink href="/register" className="text-sm text-center mb-2 mt-2" onClick={() => {
                    // setredirect_to_register(true);
                  }}>
                    {"Don't have an account? Sign Up"}
                  </TextLink>
                </Grid>
                <Grid container justifyContent="center">
                  <Grid item>
                    <div style={{ color: "#E22134", opacity: incorrect_login ? 1 : 0, transition: 'opacity 0.5s' }}>
                      <p>{incorrect_login_message.content}</p>
                    </div>
                  </Grid>
                </Grid>
                <Grid container justifyContent="center">
                  <Grid item>
                    <div style={{ color: "#E22134", opacity: server_offline ? 1 : 0, transition: 'opacity 0.5s' }}>
                      <p>{server_offline_message.content}</p>
                    </div>
                  </Grid>
                </Grid>
                {tokenError && (
                  <Grid container justifyContent="center">
                    <Grid item>
                      <div style={{ color: "#E22134", opacity: 1, transition: 'opacity 0.5s' }}>
                        <p>{tokenError}</p>
                      </div>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Box>
          <Copyright sx={{ mt: 2 }} />
        </Container>
        <Box sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16, 
          zIndex: 2
        }}>
      </Box>
      </Box>
    </ThemeProvider>

  );
}



