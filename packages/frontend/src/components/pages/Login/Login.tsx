import * as React from 'react';
import { useState, useEffect } from 'react';
import NeuraNet_Logo from '/static/NeuraNet_Icons/web/icon-512.png';
import Button from '@mui/material/Button';
import axios from 'axios';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
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
import { Link as RouterLink } from 'react-router-dom';

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
        
        // Use the new initAuthState function
        const authState = await initAuthState();
        
        if (authState.isAuthenticated && authState.username) {
          // Token is valid, proceed with auto-login
          setUsername(authState.username);
          localStorage.setItem('authToken', authState.username);
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
        if (result.success && result.deviceId) {
          // Check if this is the user's first login
          const hasCompletedOnboarding = localStorage.getItem(`onboarding_${email}`);
          
          if (!hasCompletedOnboarding) {
            localStorage.setItem('pendingAuthEmail', email);
            localStorage.setItem('deviceId', result.deviceId);
            localStorage.setItem('authUsername', email);
            setUsername(email);
            setShowOnboarding(true);
          } else {
            setUsername(email);
            localStorage.setItem('authToken', email);
            localStorage.setItem('deviceId', result.deviceId);
            localStorage.setItem('authUsername', email);
            setIsAuthenticated(true);
            setShowMain(true);
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
    setTokenError(null); // Clear any token errors on new login attempt
    try {
      // Create HTTP server before initiating OAuth flow
      const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

        if (req.url?.includes('/authentication/auth/callback')) {
          const code = new URL(req.url, 'http://localhost:3000').searchParams.get('code');

          if (code) {
            try {
              const response = await axios.get(`${banbury.config.url}/authentication/auth/callback?code=${code}`);
              if (response.data.success) {
                const email = response.data.user.email;
                // Get device ID from the response if available
                const deviceId = response.data.user.deviceId;
                
                const hasCompletedOnboarding = localStorage.getItem(`onboarding_${email}`);
                
                if (!hasCompletedOnboarding) {
                  localStorage.setItem('pendingAuthEmail', email);
                  localStorage.setItem('deviceId', deviceId);
                  localStorage.setItem('authUsername', email);
                  setUsername(email);
                  setShowOnboarding(true);
                } else {
                  setUsername(email);
                  localStorage.setItem('authToken', email);
                  localStorage.setItem('deviceId', deviceId);
                  localStorage.setItem('authUsername', email);
                  setIsAuthenticated(true);
                  setShowMain(true);
                }
              }
            } catch (error) {
              console.error('Callback Error:', error);
              setserver_offline(true);
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Authentication failed');
            }
          }

          // Close the server after handling the callback
          server.close();
        }
      });

      // Start listening before opening OAuth URL
      server.listen(3000, async () => {
        const response = await axios.get(`${banbury.config.url}/authentication/google`);
        shell.openExternal(response.data.authUrl);
      });

    } catch (error) {
      console.error('OAuth Error:', error);
      setserver_offline(true);
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
      localStorage.setItem('authToken', email);
      localStorage.setItem(`onboarding_${email}`, 'true'); // Store onboarding completion per user
      localStorage.setItem('authUsername', email);
      localStorage.removeItem('pendingAuthEmail'); // Clean up the temporary storage
    }
    
    setShowOnboarding(false); // Explicitly hide onboarding
    setIsAuthenticated(true);
    setShowMain(true);
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
            <Typography component="h1" variant="h5">
              Sign in
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Username"
                name="email"
                autoComplete="email"
                size='medium'
                autoFocus
                InputProps={{
                  // style: { fontSize: '1.7rem' }, // Adjusts text font size inside the input box

                }}
                InputLabelProps={{
                  required: false, // Remove the asterisk
                  // style: { fontSize: '1.7rem' }, // Adjusts the label font size
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                size='medium'
                id="password"
                autoComplete="current-password"
                InputProps={{
                  // style: { fontSize: '1.3rem' }, // Adjusts text font size inside the input box
                }}
                InputLabelProps={{
                  required: false, // Remove the asterisk
                  // style: { fontSize: '1.3rem' }, // Adjusts the label font size
                }}

              />
              <FormControlLabel
                control={<Checkbox value="remember" color="primary" />}
                // label="Remember me"
                label={<Typography style={{ fontSize: '15px' }}>Remember me</Typography>}
              />

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

              <Typography variant="body2" align="center" sx={{ my: 1 }}>
                - OR -
              </Typography>


              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                Sign in with Google
              </Button>
              <Grid container>
                <Grid item xs>
                  {/* <Link href="/register" variant="body2"> */}
                  <Link variant="body2" onClick={() => {
                    // setredirect_to_register(true);
                  }}>
                    Forgot password?
                  </Link>
                </Grid>
                <Grid item>
                  <Link component={RouterLink} to="/register" variant="body2">
                    {"Don't have an account? Sign Up"}
                  </Link>
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



