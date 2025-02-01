import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import MuiDrawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import ListItem from '@mui/material/ListItem';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import Files from './pages/Files/Files';
import Friends from './pages/Friends/Friends';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import Devices from './pages/Devices';
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
import { Stack } from '@mui/material';
import { handlers } from '../handlers';
const { ipcRenderer } = window.require('electron');
import NavigateBeforeOutlinedIcon from '@mui/icons-material/NavigateBeforeOutlined';
import NavigateNextOutlinedIcon from '@mui/icons-material/NavigateNextOutlined';
import UploadProgress from './common/upload_progress/upload_progress';
import DownloadProgress from './common/download_progress/download_progress';
import NotificationsButton from './common/notifications/NotificationsButton';
import AccountMenuIcon from './common/AccountMenuIcon';
import { Tabs as CustomTabs } from './common/Tabs/Tabs';
import { getUploadsInfo } from './common/upload_progress/add_uploads_info';
import { getDownloadsInfo } from './common/download_progress/add_downloads_info';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

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

// Define an interface for tab state
interface TabState {
  id: string;
  label: string;
  view: string;  // Stores which view is active in this tab (Files, Devices, etc.)
  path?: string; // Store current path or other relevant state
}

export default function PermanentDrawerLeft() {
  const location = useLocation();
  const theme = useTheme();
  const initialActiveTab = location.state?.activeTab || 'Files';
  const [activeTab, setActiveTab] = React.useState(initialActiveTab);
  const { username, redirect_to_login, tasks, setTasks, setTaskbox_expanded, websocket, setSocket } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [tabs, setTabs] = useState<TabState[]>([
    {
      id: 'tab-1',
      label: 'Files',
      view: 'Files',
    }
  ]);
  const [currentTabId, setCurrentTabId] = useState('tab-1');
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    tabId: string;
  } | null>(null);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [draggedOverTab, setDraggedOverTab] = useState<string | null>(null);

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





  const [downloads, setDownloads] = useState<{
    filename: string;
    fileType: string;
    progress: number;
    status: 'downloading' | 'completed' | 'failed' | 'skipped';
    totalSize: number;
    downloadedSize: number;
    timeRemaining?: number;
  }[]>([]);

  useEffect(() => {
    const downloadUpdateInterval = setInterval(() => {
      const currentDownloads = getDownloadsInfo();
      setDownloads(currentDownloads);
    }, 1000);

    return () => clearInterval(downloadUpdateInterval);
  }, []);

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
    const uploadUpdateInterval = setInterval(() => {
      const currentUploads = getUploadsInfo();
      setUploads(currentUploads);
    }, 1000);

    return () => clearInterval(uploadUpdateInterval);
  }, []);

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) return;

    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);

    if (currentTabId === tabId) {
      const tabIndex = tabs.findIndex(tab => tab.id === tabId);
      const newActiveTab = newTabs[Math.max(0, tabIndex - 1)];
      setCurrentTabId(newActiveTab.id);
      setActiveTab(newActiveTab.view); // Update the active view based on the tab
    }
  };

  const handleAddTab = () => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: TabState = {
      id: newTabId,
      label: activeTab,
      view: activeTab,
    };
    setTabs([...tabs, newTab]);
    setCurrentTabId(newTabId);
  };

  // Update when sidebar selection changes
  const handleSidebarChange = (newView: string) => {
    // Update the current tab's view and label
    setTabs(currentTabs =>
      currentTabs.map(tab =>
        tab.id === currentTabId
          ? { ...tab, view: newView, label: newView }
          : tab
      )
    );
    setActiveTab(newView);
  };

  // Handle tab changes
  const handleTabChange = (tabId: string) => {
    setCurrentTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTab(tab.view); // Restore the view associated with this tab
    }
  };

  // Handle tab reordering
  const handleDragStart = (tabId: string) => {
    setDraggedTab(tabId);
  };

  const handleDragEnd = () => {
    if (draggedTab && draggedOverTab) {
      const draggedIndex = tabs.findIndex(tab => tab.id === draggedTab);
      const dropIndex = tabs.findIndex(tab => tab.id === draggedOverTab);

      const newTabs = [...tabs];
      const [draggedItem] = newTabs.splice(draggedIndex, 1);
      newTabs.splice(dropIndex, 0, draggedItem);

      setTabs(newTabs);
    }
    setDraggedTab(null);
    setDraggedOverTab(null);
  };

  const handleDragOver = (tabId: string) => {
    if (draggedTab && draggedTab !== tabId) {
      setDraggedOverTab(tabId);
    }
  };

  // Context menu handlers
  const handleContextMenu = (event: React.MouseEvent, tabId: string) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      tabId,
    });
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
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Stack>
        <Box>
          <Stack direction="row" paddingLeft={10}>
            <Tooltip title="Navigate back">
              <Button
                onClick={() =>
                  handlers.buttons.backButton(
                    '',
                    () => { },
                    [],
                    () => { },
                    () => { },
                  )
                }
                sx={{ paddingLeft: '4px', paddingRight: '4px', marginTop: '8px', minWidth: '30px', zIndex: 9999 }}
              >
                <NavigateBeforeOutlinedIcon fontSize="inherit" />
              </Button>
            </Tooltip>
            <Tooltip title="Navigate forward">
              <Button
                onClick={() =>
                  handlers.buttons.forwardButton(
                    '',
                    () => { },
                    [],
                    () => { },
                    [],
                    () => { },
                  )
                }
                sx={{ paddingLeft: '4px', paddingRight: '4px', marginTop: '8px', minWidth: '30px', zIndex: 9999 }}
              >
                <NavigateNextOutlinedIcon fontSize="inherit" />
              </Button>
            </Tooltip>
            <div className="flex justify-between items-center h-8 bg-[#2a2a2a] border-b border-black">
              <style>
                {`
                  .no-drag {
                    -webkit-app-region: no-drag !important;
                  }
                  .tab-container {
                    display: flex;
                    flex-grow: 1;
                    position: relative;
                    -webkit-app-region: no-drag;
                  }
                `}
              </style>
              <div className="flex flex-grow no-drag">
                <CustomTabs
                  tabs={tabs}
                  activeTab={currentTabId}
                  onTabChange={handleTabChange}
                  onTabClose={handleCloseTab}
                  onTabAdd={handleAddTab}
                  onReorder={(sourceIndex, destinationIndex) => {
                    const newTabs = [...tabs];
                    const [draggedItem] = newTabs.splice(sourceIndex, 1);
                    newTabs.splice(destinationIndex, 0, draggedItem);
                    setTabs(newTabs);
                  }}
                />
              </div>

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
                sx={{
                  pt: 1,
                  pr: isMac ? 2 : 20,
                  position: 'absolute',
                  right: 0,
                  top: 0,
                }}
              >
                <UploadProgress uploads={uploads} />
                <DownloadProgress downloads={downloads} />
                <NotificationsButton />
                <AccountMenuIcon />
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
                'Sync',
                'Shared',
                'Devices',
                'Friends'].map((text) => (
                  <Tooltip title={text} key={text} placement="right">
                    <ListItem key={text} sx={{ padding: '2px', paddingTop: '0px' }}>
                      <Button
                        onClick={() => handleSidebarChange(text)}
                        sx={{
                          paddingLeft: '4px',
                          paddingRight: '4px',
                          minWidth: '30px',
                        }}
                      >
                        {text === 'Files' && <FolderOutlinedIcon fontSize='inherit' />}
                        {text === 'Sync' && <CloudOutlinedIcon fontSize='inherit' />}
                        {text === 'Shared' && <FolderSharedOutlinedIcon fontSize='inherit' />}
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
              ));
            })()}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

