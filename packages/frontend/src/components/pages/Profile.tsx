import React, { useEffect, useState } from 'react'
import axios from 'axios';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { Typography, Grid, Button } from "@mui/material";
import { Stack } from '@mui/material';
import AccountMenuIcon from '../common/AccountMenuIcon';
import { useAuth } from '../../context/AuthContext';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import { Email } from '@mui/icons-material';
import { handlers } from '../../handlers';

const { ipcRenderer } = window.require('electron');

ipcRenderer.on('python-output', (_event: any, data: any) => {
  console.log('Received Python output:', data);
});

export default function Profile() {
  const { username } = useAuth();
  const [firstname, setFirstname] = useState<string>('');
  const [lastname, setLastname] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`https://website2-v3xlkt54dq-uc.a.run.app/get_small_user_info/${username}/`);
        const fetchedFirstname = response.data.first_name;
        const fetchedLastname = response.data.last_name;
        const fetchedemail = response.data.email;
        setFirstname(fetchedFirstname);
        setLastname(fetchedLastname);
        setEmail(fetchedemail);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);


  const [showFirstnameTextField, setShowFirstnameTextField] = useState(false);
  const [new_first_name, set_new_first_name] = useState('');
  const handleFirstnameClick = async () => {
    try {
      setShowFirstnameTextField(!showFirstnameTextField);
    } catch (error) {
      console.error('There was an error!', error);
    }
  };
  const handleFirstnameConfirmClick = async () => {

    setShowFirstnameTextField(!showFirstnameTextField);

    handlers.users.change_profile_info(new_first_name, lastname, username ?? '', email ?? '', "undefined", null);
  };

  const [showLastnameTextField, setShowLastnameTextField] = useState(false);
  const handleLastnameClick = async () => {
    try {
      setShowLastnameTextField(!showLastnameTextField);
    } catch (error) {
      console.error('There was an error!', error);
    }
  };
  const handleLastnameConfirmClick = async () => {
    try {
      handlers.users.change_profile_info(new_first_name, lastname, username ?? '', email ?? '', "undefined", null);
    } catch (error) {
      console.error('There was an error!', error);

    }
  };



  const [showUsernameTextField, setShowUsernameTextField] = useState(false);
  const handleUsernameClick = async () => {
    try {
      setShowUsernameTextField(!showUsernameTextField);
    } catch (error) {
      console.error('There was an error!', error);
    }
  };
  const handleUsernameConfirmClick = async () => {
    try {
      handlers.users.change_profile_info(new_first_name, lastname, username ?? '', email ?? '', "undefined", null);
    } catch (error) {
      console.error('There was an error!', error);

    }
  };

  const [showEmailTextField, setShowEmailTextField] = useState(false);
  const handleEmailClick = async () => {
    try {
      setShowEmailTextField(!showEmailTextField);
    } catch (error) {
      console.error('There was an error!', error);
    }
  };
  const handleEmailConfirmClick = async () => {
    try {
      handlers.users.change_profile_info(new_first_name, lastname, username ?? '', email ?? '', "undefined", null);
    } catch (error) {
      console.error('There was an error!', error);

    }
  };


  const [showPasswordTextField, setShowPasswordTextField] = useState(false);
  const handlePasswordClick = async () => {
    try {
      setShowPasswordTextField(!showPasswordTextField);
    } catch (error) {
      console.error('There was an error!', error);
    }
  };
  const handlePasswordConfirmClick = async () => {
    try {
      handlers.users.change_profile_info(new_first_name, lastname, username ?? '', email ?? '', "undefined", null);
    } catch (error) {
      console.error('There was an error!', error);

    }
  };


  return (

    <Box sx={{ width: '100%', height: '100vh', pl: 2, pr: 2, mt: 0, pt: 5 }}>
      <Stack spacing={2}>
        <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
          <Grid item>
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
              <AccountMenuIcon />
            </Box>
          </Grid>
        </Grid>
        <Grid container spacing={1}>
        </Grid>
      </Stack>
      <Grid container spacing={2} columns={1} overflow="inherit">
        <Grid item xs={8}>
          <Card variant='outlined'>
            <CardContent>
              <Box my={0}>
                <Stack spacing={4}>
                  <Typography variant="h4" gutterBottom>Account</Typography>
                  <Stack spacing={1}>
                    <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
                      <Grid item>
                        <Typography variant="subtitle1" gutterBottom>First Name</Typography>
                        {showFirstnameTextField ? (
                          <TextField
                            id="Firstname"
                            size='small'
                            defaultValue={firstname}
                            onChange={(event) => set_new_first_name(event.target.value)}
                          />
                        ) : (
                          <Typography variant="body2" gutterBottom>{firstname}</Typography>
                        )}
                      </Grid>
                      {showFirstnameTextField ? (
                        <Grid item pr={4}>
                          <Stack direction="row" spacing={2}>
                            <Button variant="outlined" onClick={handleFirstnameClick} size="small">
                              {showFirstnameTextField ? 'Cancel' : 'Change'}
                            </Button>
                            <Button variant="contained" color='success' onClick={handleFirstnameConfirmClick} size="small">
                              Submit
                            </Button>
                          </Stack>
                        </Grid>

                      ) : (
                        <Grid item pr={4}>
                          <Button variant="outlined" onClick={handleFirstnameClick} size="small">
                            {showFirstnameTextField ? 'Cancel' : 'Change'}
                          </Button>
                        </Grid>
                      )}
                    </Grid>
                    <Divider orientation="horizontal" variant="middle" />


                    <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
                      <Grid item>
                        <Typography variant="subtitle1" gutterBottom>Last Name</Typography>
                        {showLastnameTextField ? (
                          <TextField
                            id="Lastname"
                            size='small'
                            defaultValue={lastname}
                          />
                        ) : (
                          <Typography variant="body2" gutterBottom>{lastname}</Typography>
                        )}
                      </Grid>
                      {showLastnameTextField ? (
                        <Grid item pr={4}>
                          <Stack direction="row" spacing={2}>
                            <Button variant="outlined" onClick={handleLastnameClick} size="small">
                              {showLastnameTextField ? 'Cancel' : 'Change'}
                            </Button>
                            <Button variant="contained" color='success' onClick={handleLastnameConfirmClick} size="small">
                              Submit
                            </Button>
                          </Stack>
                        </Grid>

                      ) : (
                        <Grid item pr={4}>
                          <Button variant="outlined" onClick={handleLastnameClick} size="small">
                            {showUsernameTextField ? 'Cancel' : 'Change'}
                          </Button>
                        </Grid>
                      )}
                    </Grid>
                    <Divider orientation="horizontal" variant="middle" />


                    <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
                      <Grid item>
                        <Typography variant="subtitle1" gutterBottom>Username</Typography>
                        {showUsernameTextField ? (
                          <TextField
                            id="Username"
                            size='small'
                            defaultValue={username}
                          />
                        ) : (
                          <Typography variant="body2" gutterBottom>{username}</Typography>
                        )}
                      </Grid>
                      {showUsernameTextField ? (
                        <Grid item pr={4}>
                          <Stack direction="row" spacing={2}>
                            <Button variant="outlined" onClick={handleUsernameClick} size="small">
                              {showUsernameTextField ? 'Cancel' : 'Change'}
                            </Button>
                            <Button variant="contained" color='success' onClick={handleUsernameConfirmClick} size="small">
                              Submit
                            </Button>
                          </Stack>
                        </Grid>

                      ) : (
                        <Grid item pr={4}>
                          <Button variant="outlined" onClick={handleUsernameClick} size="small">
                            {showUsernameTextField ? 'Cancel' : 'Change'}
                          </Button>
                        </Grid>
                      )}
                    </Grid>
                    <Divider orientation="horizontal" variant="middle" />



                    <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
                      <Grid item>
                        <Typography variant="subtitle1" gutterBottom>Email</Typography>
                        {showEmailTextField ? (
                          <TextField
                            id="email"
                            size='small'
                            defaultValue={Email}
                          />
                        ) : (
                          <Typography variant="body2" gutterBottom>{email}</Typography>
                        )}
                      </Grid>
                      {showEmailTextField ? (
                        <Grid item pr={4}>
                          <Stack direction="row" spacing={2}>
                            <Button variant="outlined" onClick={handleEmailClick} size="small">
                              {showEmailTextField ? 'Cancel' : 'Change'}
                            </Button>
                            <Button variant="contained" color='success' onClick={handleEmailConfirmClick} size="small">
                              Submit
                            </Button>
                          </Stack>
                        </Grid>

                      ) : (
                        <Grid item pr={4}>
                          <Button variant="outlined" onClick={handleEmailClick} size="small">
                            {showEmailTextField ? 'Cancel' : 'Change'}
                          </Button>
                        </Grid>
                      )}
                    </Grid>
                    <Divider orientation="horizontal" variant="middle" />


                    <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
                      <Grid item>
                        <Typography variant="subtitle1" gutterBottom>Password</Typography>
                        {showPasswordTextField ? (
                          <TextField
                            id="password"
                            size='small'
                            defaultValue=""
                            type="password"
                          />
                        ) : (
                          <Typography variant="body2" gutterBottom>Change your account password.</Typography>
                        )}
                      </Grid>
                      {showPasswordTextField ? (
                        <Grid item pr={4}>
                          <Stack direction="row" spacing={2}>
                            <Button variant="outlined" onClick={handlePasswordClick} size="small">
                              {showPasswordTextField ? 'Cancel' : 'Change'}
                            </Button>
                            <Button variant="contained" color='success' onClick={handlePasswordConfirmClick} size="small">
                              Submit
                            </Button>
                          </Stack>
                        </Grid>

                      ) : (
                        <Grid item pr={4}>
                          <Button variant="outlined" onClick={handlePasswordClick} size="small">
                            {showPasswordTextField ? 'Cancel' : 'Change'}
                          </Button>
                        </Grid>
                      )}
                    </Grid>
                    <Divider orientation="horizontal" variant="middle" />




                    <Stack spacing={1}>
                      <Grid container columns={12} justifyContent="space-between" alignItems="center" spacing={2}>
                        <Grid item>
                          <Typography variant="subtitle1" gutterBottom>Delete Account</Typography>
                          <Typography variant="body2" gutterBottom>Permanently delete your account, licenses, and subscriptions.
                            You will be asked for confirmation before deletion proceeds.</Typography>
                        </Grid>
                        <Grid item pr={4}>
                          <Button variant="outlined" color="error" onClick={handleFirstnameClick} size="small">
                            Delete
                          </Button>
                        </Grid>
                      </Grid>

                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>

  );
}

