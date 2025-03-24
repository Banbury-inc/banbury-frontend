import * as React from 'react';
import Button from '@mui/material/Button';
import { useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { ThemeProvider } from '@mui/material/styles';
import theme from "../../../renderer/theme";
import SignIn from '../Login/Login';
import { handlers } from '../../../renderer/handlers';
import NeuraNet_Logo from '../../../../static/NeuraNet_Icons/web/icon-512.png';
function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="https://website2-v3xlkt54dq-uc.a.run.app/">
        Banbury
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

interface Message {
  type: string;
  content: string;
}




export default function SignUp() {
  const [registration_success, setregistration_success] = useState(false);
  const [user_already_exists, setuser_already_exists] = useState(false);
  const userExistsMessage: Message = {
    type: 'error',
    content: 'User already exists. Please choose a different username.',
  };
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const result = await handlers.users.registerUser(
        data.get('firstName') as string,
        data.get('lastName') as string,
        data.get('username') as string,
        data.get('password') as string,
        data.get('phone_number') as string,
        data.get('email') as string,
        data.get('picture') as string
      );
      if (result === 'success') {
        setregistration_success(true)
      }
      if (result === 'exists') {
        setuser_already_exists(true)
      }


    } catch (error) {
      console.error('There was an error!', error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      {registration_success ? (
        <SignIn />
      ) : (
        <Container component="main" maxWidth="xs">
          <CssBaseline />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >

            <img src={NeuraNet_Logo} alt="Logo" style={{ marginTop: 100, marginBottom: 20, width: 50, height: 50 }} />
            <Typography component="h1" variant="h5">
              Sign up
            </Typography>
            <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    autoComplete="given-name"
                    name="firstName"
                    required
                    fullWidth
                    id="firstName"
                    label="First Name"
                    size='small'
                    autoFocus
                    InputProps={{
                      style: { fontSize: '1.7rem' }, // Adjusts text font size inside the input box
                    }}
                    InputLabelProps={{
                      style: { fontSize: '1.3rem' }, // Adjusts the label font size
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="lastName"
                    label="Last Name"
                    name="lastName"
                    size='small'
                    autoComplete="family-name"
                    InputProps={{
                      style: { fontSize: '1.7rem' }, // Adjusts text font size inside the input box
                    }}
                    InputLabelProps={{
                      style: { fontSize: '1.3rem' }, // Adjusts the label font size
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="username"
                    label="Username"
                    name="username"
                    size='small'
                    autoComplete="username"
                    InputProps={{
                      style: { fontSize: '1.7rem' }, // Adjusts text font size inside the input box
                    }}
                    InputLabelProps={{
                      style: { fontSize: '1.3rem' }, // Adjusts the label font size
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    size='small'
                    id="password"
                    autoComplete="new-password"
                    InputProps={{
                      style: { fontSize: '1.7rem' }, // Adjusts text font size inside the input box
                    }}
                    InputLabelProps={{
                      style: { fontSize: '1.3rem' }, // Adjusts the label font size
                    }}
                  />
                </Grid>
              </Grid>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                Sign Up
              </Button>
              <Grid container justifyContent="flex-end">
                <Grid item>
                  {/* <Link href="/login" variant="body2"> */}
                  <Link variant="body2" onClick={() => {
                    setregistration_success(true);
                  }}>

                    Already have an account? Sign in
                  </Link>
                </Grid>
              </Grid>
              <Grid container justifyContent="center">
                <Grid item>
                  <div style={{ color: "#E22134", opacity: user_already_exists ? 1 : 0, transition: 'opacity 0.5s' }}>
                    <p>{userExistsMessage.content}</p>
                  </div>
                </Grid>
              </Grid>
            </Box>
          </Box>
          <Copyright sx={{ mt: 5 }} />
        </Container>
      )}
    </ThemeProvider>
  );
}
