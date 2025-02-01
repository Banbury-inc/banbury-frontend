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
import theme from "../../theme";
import Main from "../main";
import Register from "./Register";
import { useAuth } from '../../context/AuthContext';
import fs from 'fs';
import dotenv from 'dotenv';
import os from 'os';
import ConfigParser from 'configparser';
import { handlers } from '../../handlers';
import { CONFIG } from '../../config/config';
import { Google as GoogleIcon } from '@mui/icons-material';
import { shell } from 'electron';
import http from 'http';

interface Message {
  type: string;
  content: string;
}

// Define the type for the return value of send_login_request
interface LoginSuccess {
  result: 'login success';
  token: string;
}

interface LoginFailure {
  result: 'login failed';
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



dotenv.config();

const path = require('path');


const homeDirectory = os.homedir();
const BANBURY_FOLDER = path.join(homeDirectory, '.banbury');
const CONFIG_FILE = path.join(BANBURY_FOLDER, '.banbury_config.ini');

if (!fs.existsSync(BANBURY_FOLDER)) {
  fs.mkdirSync(BANBURY_FOLDER);
}

if (!fs.existsSync(CONFIG_FILE)) {
  const config = new ConfigParser();
  config.set('banbury_cloud', 'credentials_file', 'credentials.json');
  fs.writeFileSync(CONFIG_FILE, config.toString());
}

function loadCredentials(): Record<string, string> {
  try {
    const config = new ConfigParser();
    config.read(CONFIG_FILE);
    const credentialsFile = config.get('banbury_cloud', 'credentials_file') || 'default_filename.json';
    const credentialsFilePath = path.join(BANBURY_FOLDER, credentialsFile);
    return JSON.parse(fs.readFileSync(credentialsFilePath, 'utf-8'));
  } catch (error) {
    return {};
  }
}



function saveCredentials(credentials: Record<string, string>): void {
  const config = new ConfigParser();
  config.read(CONFIG_FILE);
  const credentialsFile = config.get('banbury_cloud', 'credentials_file') || 'default_filename.json';
  const credentialsFilePath = path.join(BANBURY_FOLDER, credentialsFile);
  fs.writeFileSync(credentialsFilePath, JSON.stringify(credentials));
}

export default function SignIn() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [redirect_to_register, setredirect_to_register] = useState(false);
  const { setUsername, websocket, setSocket } = useAuth(); // Destructure setUsername from useAuth
  const [incorrect_login, setincorrect_login] = useState(false);
  const [server_offline, setserver_offline] = useState(false);
  const incorrect_login_message: Message = {
    type: 'error',
    content: 'Incorrect username or password',
  };
  const server_offline_message: Message = {
    type: 'error',
    content: 'Server is offline. Please try again later.',
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setUsername(token);
      setIsAuthenticated(true);
      setShowMain(true); // Set showMain to true when login is successful
    }
  }, []);

  // Move the useState hook outside of the handleSubmit function
  const [showMain, setShowMain] = useState<boolean>(false);
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const handleSubmit1 = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("sending login request")
    const data = new FormData(event.currentTarget);
    const email = data.get('email') as string | null;
    const password = data.get('password') as string | null;

    if (email && password) {
      try {

        const result = await send_login_request(email, password);
        console.log(result);
        setUsername(email);
        setIsAuthenticated(true);
        console.log('Result: Login successful.');
        setShowMain(true); // Set showMain to true when login is successful
      } catch (error) {
        console.error('Error:', error);
        setincorrect_login(true);
      }
    }
  };
  // Move the useState hook outside of the handleSubmit function
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setLoading(true);
    event.preventDefault();
    console.log("sending login request")
    const data = new FormData(event.currentTarget);
    const email = data.get('email') as string | null;
    const password = data.get('password') as string | null;
    const token = data.get('token') as string | null;

    // if (email && password) {
    if (typeof email === 'string' && typeof password === 'string') {

      try {


        // let senderSocket = await connectToRelayServer2();
        const result = await send_login_request(email, password);
        if (result === 'login success') {
          console.log(result);
          setUsername(email);
          localStorage.setItem('authToken', email);
          setIsAuthenticated(true);
          console.log('Result: Login successful.');
          setShowMain(true); // Set showMain to true when login is successful
        }
        if (result === 'login failed') {
          console.log('Result: Login failed.');
          setincorrect_login(true);
          setLoading(false);
        }
        else {
          console.log('Result: Login failed.');
          setincorrect_login(true);
        }
      } catch (error) {
        console.error('Error:', error);
        setincorrect_login(true);
      }
    }
  };


  async function send_login_request(username: string, password: string) {
    try {
      const response = await axios.get<{
        result: string;
        token: string;
        username: string;
        // }>(CONFIG.url + 'getuserinfo2/' + username + '/');
      }>(CONFIG.url + '/authentication/getuserinfo4/' + username + '/' + password + '/');
      // }>(CONFIG.url + 'getuserinfo/');
      const result = response.data.result;
      if (result === 'success') {
        console.log("login success");
        return 'login success';
      }
      if (result === 'fail') {
        console.log("login failed");
        return 'login failed';
      }
      else {
        console.log("login failed");
        return 'login failed';
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
  const handleClick = () => {
    setLoading(true);
    // Simulate a network request or any asynchronous operation
    setTimeout(() => {
      setLoading(false);
      // Your scroll or any other logic goes here
      // Example: scroll.scrollTo('targetSection', { duration: 800, smooth: 'easeInOutQuad' });
    }, 2000); // Adjust the timeout duration as needed
  };



  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setUsername(token);
      setIsAuthenticated(true);
      setShowMain(true); // Set showMain to true when login is successful
    }
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Create HTTP server before initiating OAuth flow
      const server = http.createServer(async (req, res) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

        if (req.url?.includes('/authentication/auth/callback')) {
          const code = new URL(req.url, 'http://localhost:3000').searchParams.get('code');

          if (code) {
            try {
              const response = await axios.get(`${CONFIG.url}/authentication/auth/callback?code=${code}`);
              if (response.data.success) {
                console.log(response)
                setUsername(response.data.user.email);
                const username = response.data.user.email;
                const first_name = response.data.user.first_name;
                const last_name = response.data.user.last_name;
                const phone_number = response.data.user.phone_number;
                const email = response.data.user.email;
                const picture = response.data.user.picture;

                try {
                  // Try to get user info to check if user exists
                  const userInfoResponse = await axios.get<{
                    first_name: string;
                    last_name: string;
                    phone_number: string;
                    email: string;
                  }>(`${CONFIG.url}/users/getuserinfo/${username}/`);

                  // User exists, set authenticated
                  setIsAuthenticated(true);
                } catch (error) {

                  console.log("username: ", username)
                  console.log("first_name: ", first_name)
                  console.log("last_name: ", last_name)
                  console.log("phone_number: ", phone_number)
                  console.log("email: ", email)
                  console.log("picture: ", picture)

                  // User doesn't exist, register them
                  const registerResponse = await handlers.users.registerUser(username, username, first_name, last_name, phone_number, email, picture);

                  if (registerResponse === 'success') {
                    setIsAuthenticated(true);
                  } else {
                    console.error('Failed to register Google user');
                  }
                }

                // TODO: implement login error handling

                localStorage.setItem('authToken', response.data.user.email);
                setIsAuthenticated(true);
                setShowMain(true);

                // Send success response to browser
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<html><body><h1>Login successful! You can close this window.</h1><script>window.close();</script></body></html>');
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
        const response = await axios.get(`${CONFIG.url}/authentication/google`);
        shell.openExternal(response.data.authUrl);
      });

    } catch (error) {
      console.error('OAuth Error:', error);
      setserver_offline(true);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated || showMain) { // Render Main component if authenticated or showMain is true
    return <Main />;
  }
  if (redirect_to_register || showRegister) { // Render Main component if authenticated or showMain is true
    return <Register />;
  }

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
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
    </ThemeProvider>
  );
}



