import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import MuiDrawer from '@mui/material/Drawer';
import Icon from '@mui/material/Icon';
import Divider from '@mui/material/Divider';
import ShareIcon from '@mui/icons-material/Share';
import Button from '@mui/material/Button';
import ListItem from '@mui/material/ListItem';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AccountBoxOutlinedIcon from '@mui/icons-material/AccountBoxOutlined';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import Files from './pages/Files/Files';
import Friends from './pages/Friends/Friends';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import Devices from './pages/Devices';
import Profile from './pages/Profile';
import AI from './pages/AI';
import Settings from './pages/Settings/Settings';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import DevicesIcon from '@mui/icons-material/Devices';
import SettingsIcon from '@mui/icons-material/Settings';
import Sync from './pages/Sync/Sync';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import Login from './pages/Login';
import { CONFIG } from '../config/config';
import Tooltip from '@mui/material/Tooltip';
import os from 'os';
import path from 'path';
import { neuranet } from '../neuranet';
import Shared from './pages/Shared/Shared';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import Logs from './pages/Logs/Logs';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
const { ipcRenderer } = window.require('electron');

const drawerWidth = 240;  // Change the width as needed
// const drawerWidth = 150;  // Change the width as needed

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(4)} + 8px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(4)} + 8px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(1, 1),
  ...theme.mixins.toolbar,
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
);

export default function PermanentDrawerLeft() {
  const location = useLocation();
  const theme = useTheme();
  const initialActiveTab = location.state?.activeTab || 'Files';
  const [activeTab, setActiveTab] = React.useState(initialActiveTab);
  const { username, redirect_to_login, tasks, setTasks, setTaskbox_expanded, websocket, setSocket } = useAuth();
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    async function setupConnection() {
      try {
        const fullDeviceSync = CONFIG.full_device_sync;
        const skipDotFiles = CONFIG.skip_dot_files;
        const bcloudDirectoryPath = fullDeviceSync ? os.homedir() : path.join(os.homedir(), 'BCloud');

        const websocket = await neuranet.device.connect(username || "default", tasks || [], setTasks, setTaskbox_expanded);
        setSocket(websocket);
        neuranet.device.detectFileChanges(username || "default", bcloudDirectoryPath);
      } catch (error) {
        console.error("Failed to setup connection:", error);
      }
    }

    setupConnection();
  }, [username]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const toggleDrawer = () => {
    setOpen(!open);
  };

  if (redirect_to_login) {
    return <Login />;
  }

  return (
    // <Box sx={{ display: 'flex', width: '100vw' }}>
    <Box sx={{ display: 'flex', width: '100vw', height: '100%', overflow: 'hidden' }}>
      <CssBaseline />
      <Drawer
        sx={{
          '& .MuiDrawer-paper': {
            marginTop: '40px',
            paddingLeft: '4px',
            backgroundColor: theme.palette.background.default,
          },
        }}
        variant="permanent"
        open={open}
        anchor="left"
      >
        {/* <DrawerHeader> */}
        {/*   <IconButton */}
        {/*     color="inherit" */}
        {/*     aria-label="open drawer" */}
        {/*     onClick={toggleDrawer} */}
        {/*     edge="start" */}
        {/*     sx={{ */}
        {/*       marginRight: 0, */}
        {/*     }} */}
        {/*   > */}
        {/*     <MenuIcon /> */}
        {/*   </IconButton> */}
        {/* </DrawerHeader> */}

        <List>
          {['Files',
            'Sync',
            'Shared',
            'Devices',
            'Friends'].map((text, index) => (
              <Tooltip title={text} key={text} placement="right">
                <ListItem key={text} sx={{ padding: '2px', paddingTop: '2px' }}>
                  <Button
                    onClick={() => setActiveTab(text)}
                    sx={{
                      paddingLeft: '4px',
                      paddingRight: '4px',
                      minWidth: '30px',
                    }} // Adjust the left and right padding as needed

                  >
                    <Icon
                      fontSize="inherit"
                    >

                      {(() => {
                        switch (index % 5) {
                          case 0:
                            return <FolderOutlinedIcon fontSize='inherit' />;
                          case 1:
                            return <CloudOutlinedIcon fontSize='inherit' />;
                          case 2:
                            return <FolderSharedOutlinedIcon fontSize='inherit' />;
                          case 3:
                            return <DevicesIcon fontSize='inherit' />;
                          case 4:
                            return <PeopleOutlinedIcon fontSize='inherit' />;
                          default:
                            return null;
                        }
                      })()}
                    </Icon>
                    {/*   <ListItemText */}
                    {/*     secondary={text} */}
                    {/*     sx={{ */}
                    {/*       opacity: open ? 1 : 1, */}
                    {/*       display: 'block', */}
                    {/*       textAlign: 'center', */}
                    {/*     }} */}
                    {/*   /> */}
                  </Button>
                </ListItem>
              </Tooltip>
            ))}
        </List>
        <Divider />
        <List>
          {['Logs', 'Settings'].map((text) => (

            <Tooltip title={text} key={text} placement="right">
              <ListItem key={text} sx={{ padding: '2px' }}>
                <Button
                  sx={{
                    paddingLeft: '4px',
                    paddingRight: '4px',
                    minWidth: '30px',
                  }} // Adjust the left and right padding as needed

                  onClick={() => setActiveTab(text)}
                >
                  <Icon
                    fontSize='inherit'
                  >
                    {text === 'Logs' ? <FactCheckOutlinedIcon fontSize='inherit' /> : <SettingsIcon fontSize='inherit' />}
                  </Icon>
                  {/* <ListItemText */}
                  {/*   secondary={text} */}
                  {/*   sx={{ */}
                  {/*     opacity: open ? 1 : 1, */}
                  {/*     display: 'block', */}
                  {/*     textAlign: 'center', */}
                  {/*   }} */}
                  {/* /> */}
                </Button>
              </ListItem>
            </Tooltip>
          ))}
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 0, width: 'calc(100vw - 240px)' }}
      >
        {(() => {
          switch (activeTab) {
            case 'Files':
              return <Files />;
            case 'Sync':
              return <Sync />;
            case 'Shared':
              return <Shared />;
            case 'Devices':
              return <Devices />;
            case 'Logs':
              return <Logs />;
            case 'AI':
              return <AI />;
            case 'Friends':
              return <Friends />;
            case 'Settings':
              return <Settings />;
            default:
              return <Typography paragraph>Select a tab to display its content.</Typography>;
          }
        })()}
      </Box>
    </Box >
  );
}

