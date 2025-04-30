import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import MuiDrawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import ListItem from '@mui/material/ListItem';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import Files from './Files/Files';
import Friends from './Friends/Friends';
import _CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Devices from './Devices/Devices';
import Settings from './Settings/Settings';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import DevicesIcon from '@mui/icons-material/Devices';
import SettingsIcon from '@mui/icons-material/Settings';
import _Sync from './Sync/Sync';
import { useAuth } from '../../renderer/context/AuthContext';
import Login from './Login/Login';
import Tooltip from '@mui/material/Tooltip';
import os from 'os';
import path from 'path';
import banbury from '@banbury/core';
import { connect } from '@banbury/core/src/websocket/connect';
import { detectFileChanges } from '@banbury/core/src/device/watchdog';
import _Shared from './Shared/Shared';
import _FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import Logs from './Logs/Logs';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { Stack } from '@mui/material';
import UploadProgress from '../common/UploadProgressButton/UploadProgressButton';
import DownloadProgress from '../common/DownloadProgressButton/DownloadProgressButton';
import NotificationsButton from '../common/NotificationsButton/NotificationsButton';
import AccountMenuIcon from '../common/AccountMenuIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { getDownloadsInfo } from '@banbury/core/src/device/add_downloads_info';
import { getUploadsInfo } from '@banbury/core/src/device/add_uploads_info';
import { ipcRenderer } from 'electron';
import AI from './AI/AI';

const drawerWidth = 240;  // Change the width as needed

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

// Define an interface for tab state
interface TabState {
  id: string;
  label: string;
  view: string;  // Stores which view is active in this tab (Files, Devices, etc.)
  path?: string; // Store current path or other relevant state
}

export default function PermanentDrawerLeft() {
  const theme = useTheme();
  const { username, redirect_to_login, tasks, setTasks, setSocket } = useAuth();
  const open = false;
  const [tabs, setTabs] = useState<TabState[]>([
    {
      id: 'tab-1',
      label: 'Files',
      view: 'Files',
    }
  ]);
  const [currentTabId] = useState('tab-1');
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    tabId: string;
  } | null>(null);
  const [downloads, setDownloads] = useState<{
    filename: string;
    fileType: string;
    progress: number;
    status: 'downloading' | 'completed' | 'failed' | 'skipped';
    totalSize: number;
    downloadedSize: number;
    timeRemaining?: number;
  }[]>([]);
  const [uploads, setUploads] = useState<{
    filename: string;
    fileType: string;
    progress: number;
    status: 'uploading' | 'completed' | 'failed' | 'skipped';
    totalSize: number;
    uploadedSize: number;
    timeRemaining?: number;
  }[]>([]);

  useEffect(() => {
    let isSubscribed = true; // For cleanup

    async function setupConnection() {
      try {
        const fullDeviceSync = banbury.config.full_device_sync;
        const bcloudDirectoryPath = fullDeviceSync ? os.homedir() : path.join(os.homedir(), 'BCloud');

        if (username && isSubscribed) { // Only connect if we have a username
          const websocket = await connect(
            username,
            os.hostname(), // device_name
            tasks || [],
            setTasks,
          );
          if (isSubscribed) {
            setSocket(websocket);
            detectFileChanges(username, bcloudDirectoryPath);
          }
        }
      } catch (error) {
        console.error("Failed to setup connection:", error);
      }
    }

    if (username) { // Only run if we have a username
      setupConnection();
    }

    return () => {
      isSubscribed = false; // Cleanup to prevent setting state after unmount
    };
  }, [username]); // Add all dependencies

  useEffect(() => {
    const downloadUpdateInterval = setInterval(() => {
      const currentDownloads = getDownloadsInfo();
      setDownloads(prev => {
        // Only update if there are actual changes
        if (JSON.stringify(prev) !== JSON.stringify(currentDownloads)) {
          return currentDownloads;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(downloadUpdateInterval);
  }, []); // Empty dependency array since this should only run once

  useEffect(() => {
    const uploadUpdateInterval = setInterval(() => {
      const currentUploads = getUploadsInfo();
      setUploads(prev => {
        // Only update if there are actual changes
        if (JSON.stringify(prev) !== JSON.stringify(currentUploads)) {
          return currentUploads;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(uploadUpdateInterval);
  }, []); // Empty dependency array since this should only run once


  if (redirect_to_login) {
    return <Login />;
  }

  // Update when sidebar selection changes
  const handleSidebarChange = (newView: string) => {
    // If sync or shared is selected, redirect to Files with view parameter
    if (newView === 'Sync' || newView === 'Shared') {
      // Update Files tab to show appropriate view
      setTabs(currentTabs =>
        currentTabs.map(tab =>
          tab.id === currentTabId
            ? { ...tab, view: 'Files', label: newView }
            : tab
        )
      );
      
      // Add the view parameter to URL
      const viewParam = newView.toLowerCase();
      const url = new URL(window.location.href);
      url.searchParams.set('view', viewParam);
      window.history.pushState({}, '', url);
    } else {
      // Normal behavior for other views
      setTabs(currentTabs =>
        currentTabs.map(tab =>
          tab.id === currentTabId
            ? { ...tab, view: newView, label: newView }
            : tab
        )
      );
      
      // Clear view parameter from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      window.history.pushState({}, '', url);
    }
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleRenameTab = () => {
    if (!contextMenu) return;

    const newLabel = prompt('Enter new tab name:',
      tabs.find(tab => tab.id === contextMenu.tabId)?.label);

    if (newLabel) {
      setTabs(currentTabs =>
        currentTabs.map(tab =>
          tab.id === contextMenu.tabId
            ? { ...tab, label: newLabel }
            : tab
        )
      );
    }
    handleContextMenuClose();
  };

  const isMac = process.platform === 'darwin';

  return (
    <div data-testid="main-component">
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Stack>
          <Box>
            <Stack direction="row" paddingLeft={10} sx={{ 
              pointerEvents: 'auto', 
              zIndex: 1000,
              '& > *': {
                '-webkit-app-region': 'no-drag'
              }
            }}>
              <div className="flex justify-between items-center h-8 bg-[#212121]">
                <style>
                  {`
                    .no-drag {
                      -webkit-app-region: no-drag !important;
                    }
                    .tab-container {
                      display: flex;
                      flex-grow: 1;
                      position: relative;
                      bg-color: #212121;
                      -webkit-app-region: no-drag;
                    }
                  `}
                </style>
                <Menu
                  open={contextMenu !== null}
                  onClose={handleContextMenuClose}
                  anchorReference="anchorPosition"
                  anchorPosition={
                    contextMenu !== null
                      ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                      : undefined
                  }
                >
                  <MenuItem onClick={handleRenameTab}>Rename Tab</MenuItem>
                </Menu>

                <Stack
                  direction="row"
                  spacing={1}
                  className="no-drag"
                  sx={{
                    pt: 0,
                    pb: 0,
                    pr: isMac ? 2 : 0,
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    zIndex: 9999,
                    pointerEvents: 'auto',
                    height: '40px',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                    '-webkit-app-region': 'no-drag',
                  }}
                >
                  <AccountMenuIcon />
                  <UploadProgress uploads={uploads} />
                  <DownloadProgress downloads={downloads} />
                  <NotificationsButton />
                  {!isMac && (
                    <>
                      <Button
                        onClick={() => ipcRenderer.send('minimize-window')}
                        size="small"
                        className="titlebar-button"
                        sx={{
                          width: '10px',
                          height: '34px',
                          borderRadius: 0,
                          color: '#fff',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          }
                        }}
                      >
                        &#8211;
                      </Button>
                      <Button
                        onClick={() => ipcRenderer.send('maximize-window')}
                        size="small"
                        className="titlebar-button"
                        sx={{
                          width: '10px',
                          height: '34px',
                          borderRadius: 0,
                          color: '#fff',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          }
                        }}
                      >
                        &#9633;
                      </Button>
                      <Button
                        onClick={() => ipcRenderer.send('close-window')}
                        size="small"
                        className="titlebar-button"
                        sx={{
                          width: '10px',
                          height: '34px',
                          borderRadius: 0,
                          color: '#fff',
                          '&:hover': {
                            backgroundColor: '#ff0000',
                          }
                        }}
                      >
                        &#10005;
                      </Button>
                    </>
                  )}
                </Stack>
              </div>
            </Stack>
          </Box>
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
              <List>
                {['Files',
                  'AI',
                  'Devices',
                  'Friends'].map((text) => (
                    <Tooltip title={text} key={text} placement="right">
                      <ListItem key={text} sx={{ padding: '2px', paddingTop: '0px' }}>
                        <Button
                          onClick={() => handleSidebarChange(text)}
                          data-testid={`sidebar-button-${text}`}
                          sx={{
                            paddingLeft: '4px',
                            paddingRight: '4px',
                            minWidth: '30px',
                          }}
                        >
                          {text === 'Files' && <FolderOutlinedIcon fontSize='inherit' />}
                          {text === 'AI' && < AutoAwesomeIcon fontSize='inherit' />}
                          {text === 'Devices' && <DevicesIcon fontSize='inherit' />}
                          {text === 'Friends' && <PeopleOutlinedIcon fontSize='inherit' />}
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
                        }}
                        onClick={() => handleSidebarChange(text)}
                        data-testid={`sidebar-button-${text}`}
                      >
                        {text === 'Logs' && <FactCheckOutlinedIcon fontSize='inherit' />}
                        {text === 'Settings' && <SettingsIcon fontSize='inherit' />}
                      </Button>
                    </ListItem>
                  </Tooltip>
                ))}
              </List>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 0, width: 'calc(100vw - 240px)' }}>
              {(() => {
                return tabs.map(tab => (
                  <Box key={tab.id} sx={{ display: currentTabId === tab.id ? 'block' : 'none' }}>
                    {(() => {
                      switch (tab.view) {
                        case 'Files':
                          return <Files />;
                        case 'Sync':
                        case 'Shared':
                          // Redirect to Files component
                          return <Files />;
                        case 'AI':
                          return <AI />;
                        case 'Devices':
                          return <Devices />;
                        case 'Logs':
                          return <Logs />;
                        case 'Friends':
                          return <Friends />;
                        case 'Settings':
                          return <Settings />;
                        default:
                          return <Typography paragraph>Select a tab to display its content.</Typography>;
                      }
                    })()}
                  </Box>
                ));
              })()}
            </Box>
          </Box>
        </Stack>
      </Box>
    </div>
  );
}

