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
import theme from "../../../renderer/theme";
import Main from "../../pages/main";
import Register from "../Register/Register";
import { useAuth } from '../../../renderer/context/AuthContext';
import { Google as GoogleIcon } from '@mui/icons-material';
import { shell } from 'electron';
import banbury from '@banbury/core';
import Onboarding from './components/Onboarding';
import http from 'http';
import os from 'os';

interface Message {
  type: string;
  content: string;
}

interface LoginResponse {
  result: string;
  token: string;
  username: string;
  deviceId?: string;
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
  const [redirect_to_register, setredirect_to_register] = useState(false);
  const { setUsername, username } = useAuth(); // Only destructure what you need
  const [incorrect_login, setincorrect_login] = useState(false);
  const [server_offline, setserver_offline] = useState(false);
  const [showMain, setShowMain] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Messages can be defined after hooks
  const incorrect_login_message: Message = {
    type: 'error',
    content: 'Incorrect username or password',
  };
  const server_offline_message: Message = {
    type: 'error',
    content: 'Server is offline. Please try again later.',
  };

  // useEffect hook
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token && !isAuthenticated) {
      setUsername(token);
      setIsAuthenticated(true);
      setShowMain(true);
    }
  }, [setUsername, isAuthenticated]);

  // Handle submit function
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const data = new FormData(event.currentTarget);
      const email = data.get('email') as string;
      const password = data.get('password') as string;

      if (email && password) {
        const result = await send_login_request(email, password);
        if (result?.success && result.deviceId) {
          // Check if this is the user's first login
          const hasCompletedOnboarding = localStorage.getItem(`onboarding_${email}`);
          
          if (!hasCompletedOnboarding) {
            localStorage.setItem('pendingAuthEmail', email);
            localStorage.setItem('deviceId', result.deviceId);
            setUsername(email);
            setShowOnboarding(true);
          } else {
            setUsername(email);
            localStorage.setItem('authToken', email);
            localStorage.setItem('deviceId', result.deviceId);
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

  async function send_login_request(username: string, password: string) {
    try {
      const url = `${banbury.config.url}/authentication/getuserinfo4/${username}/${password}`;
      console.log('Making login request to:', url);
      
      const response = await axios.get<LoginResponse>(url);
      console.log('Response:', response.data);
      
      const result = response.data.result;
      if (result === 'success') {
        console.log("Login success");
        const deviceId = response.data.deviceId || `${username}-${os.hostname()}`;
        return {
          success: true,
          deviceId
        };
      }
      console.log("Login failed with result:", result);
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
        setserver_offline(true);
      }
      return { success: false };
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
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
                console.log(response.data)
                const deviceId = response.data.user.deviceId;
                
                const hasCompletedOnboarding = localStorage.getItem(`onboarding_${email}`);
                
                if (!hasCompletedOnboarding) {
                  localStorage.setItem('pendingAuthEmail', email);
                  localStorage.setItem('deviceId', deviceId);
                  setUsername(email);
                  setShowOnboarding(true);
                } else {
                  setUsername(email);
                  localStorage.setItem('authToken', email);
                  localStorage.setItem('deviceId', deviceId);
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
    console.log('Onboarding complete called');
    // Get the email from localStorage if it was stored during login
    const email = localStorage.getItem('pendingAuthEmail');
    console.log('Retrieved email:', email);
    
    if (email) {
      setUsername(email);
      localStorage.setItem('authToken', email);
      localStorage.setItem(`onboarding_${email}`, 'true'); // Store onboarding completion per user
      localStorage.removeItem('pendingAuthEmail'); // Clean up the temporary storage
    }
    
    setShowOnboarding(false); // Explicitly hide onboarding
    setIsAuthenticated(true);
    setShowMain(true);
    
    console.log('State updated, should redirect to main');
  };

  // Render content based on state
  if (showOnboarding) {
    console.log("Showing onboarding with username from context:", username); // Debug log
    return <Onboarding 
      onComplete={handleOnboardingComplete} 
    />;
  }

  if (isAuthenticated || showMain) {
    return <Main />;
  }

  if (redirect_to_register) {
    return <Register />;
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
                    setredirect_to_register(true);
                  }}>
                    Forgot password?
                  </Link>
                </Grid>
                <Grid item>
                  {/* <Link href="/register" variant="body2"> */}
                  <Link variant="body2" onClick={() => {
                    setredirect_to_register(true);
                  }}>

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



