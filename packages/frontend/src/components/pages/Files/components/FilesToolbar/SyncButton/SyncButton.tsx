import React, { useState, useRef } from 'react';
import { Button, Popover, Box, Typography, Stack, LinearProgress, IconButton, Tooltip } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import { banbury } from '@banbury/core';
import { useAuth } from '../../../../../../renderer/context/AuthContext';
import { useAlert } from '../../../../../../renderer/context/AlertContext';
import SyncIcon from '@mui/icons-material/Sync';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import SearchIcon from '@mui/icons-material/Search';
import { getSyncFolders } from './getSyncFolders';
import path from 'path';
import CloseIcon from '@mui/icons-material/Close';



export default function SyncButton() {
  const [syncData, setSyncData] = useState<{
    syncingFiles: any[];
    recentlyChanged: any[];
  }>({ syncingFiles: [], recentlyChanged: [] });
  const [isScanning, setIsScanning] = useState(false);
  const [deviceNotFound, setDeviceNotFound] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { tasks, setTasks, setDevices } = useAuth();
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);


  const handleClick = async (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setIsLoading(true);
    // Fetch folders to display, but don't start scanning
    const syncFolders = await getSyncFolders();
    setIsLoading(false);
    if (syncFolders.error && syncFolders.error === 'Failed to get device ID') {
      // set syncData to empty
      setSyncData({ syncingFiles: [], recentlyChanged: [] });
      setDeviceNotFound(true);
      return;
    }
    setDeviceNotFound(false);
    // Initialize folders while preserving existing progress
    const foldersWithProgress = {
      ...syncFolders,
      syncingFiles: syncFolders.syncingFiles.map((f: any) => {
        const existingFile = syncData.syncingFiles.find(ef => ef.filename === f.filename);
        return {
          ...f,
          progress: existingFile ? existingFile.progress : 0,
          speed: existingFile ? existingFile.speed : undefined
        };
      })
    };
    setSyncData(foldersWithProgress);
  };

  const handleFolderSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    try {
      const absoluteFolderPath = path.dirname(file.path);

      // Check if folder is already in scanned folders
      const existingFolder = syncData.syncingFiles.find(
        (folder) => folder.filename === absoluteFolderPath
      );
      
      if (existingFolder) {
        showAlert('Folder Already Added', [`The folder "${absoluteFolderPath}" is already being scanned.`], 'warning');
        return;
      }

      // Add the selected folder as a scanned folder
      const task_description = `Adding scanned folder: ${absoluteFolderPath}`;
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);

      const addResult = await banbury.device.addScannedFolder(absoluteFolderPath);

      if (addResult === 'success') {
        await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
        // Get fresh devices data first
        const updatedDevices = await banbury.device.fetchDeviceData();
        setDevices(Array.isArray(updatedDevices) ? updatedDevices : null);
        // Then get updated folders with fresh device data
        const updatedFolders = await getSyncFolders();


        // Initialize folders while preserving existing progress
        const foldersWithProgress = {
          ...updatedFolders,
          syncingFiles: updatedFolders.syncingFiles.map((f: any) => {
            const existingFile = syncData.syncingFiles.find(ef => ef.filename === f.filename);
            return {
              ...f,
              progress: existingFile ? existingFile.progress : 0,
              speed: existingFile ? existingFile.speed : undefined
            };
          })
        };

        setSyncData(foldersWithProgress);
      }
    } catch (err) {
      console.error('Failed to sync folder. Please try again. Error:', err);
    }
  };

  const triggerFolderSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSyncClick = async () => {
    setIsScanning(true);

    // Only reset progress for folders that haven't completed scanning
    setSyncData(prev => ({
      ...prev,
      syncingFiles: prev.syncingFiles.map(f => ({
        ...f,
        progress: f.progress === 100 ? 100 : 0,
        speed: f.progress === 100 ? 'Synced' : undefined
      }))
    }));


    for (const file of syncData.syncingFiles) {
      // Skip already synced files
      if (file.progress === 100) continue;

      const task_description = 'Scanning folder';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);

      // Update local state to show scanning started
      setSyncData(prev => ({
        ...prev,
        syncingFiles: prev.syncingFiles.map(f =>
          f.filename === file.filename
            ? { ...f, progress: 0, speed: 'Starting scan...' }
            : f
        )
      }));

      try {
        const result = await banbury.device.scanFolder(
          file.filename,
          (progress: number, speed: string) => {
            setSyncData(prev => ({
              ...prev,
              syncingFiles: prev.syncingFiles.map(f =>
                f.filename === file.filename
                  ? { ...f, progress: Math.min(100, progress), speed }
                  : f
              )
            }));
          }
        );

        if (result === 'success') {
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
        } else if (result === 'device_not_found') {
          // Handle device not found error
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert('Device Not Found', ['Current device not added. Please add device before scanning.'], 'error');
          break; // Stop scanning remaining folders
        } else if (result === 'unauthorized') {
          // Handle unauthorized error
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert('Authentication Error', ['You are not authorized to access this resource. Please log in again.'], 'error');
          break; // Stop scanning remaining folders
        }
      } catch (error) {
        console.error('Sync error:', error);
      }
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    setAnchorEl(null);
    // Remove the reset of scanning state and progress
    // setIsScanning(false);
    // setSyncData(prev => ({
    //   ...prev,
    //   syncingFiles: prev.syncingFiles.map(f => ({ ...f, progress: 0, speed: undefined }))
    // }));
  };

  const handleRemoveFolder = async (folderPath: string) => {
    try {
      const task_description = `Removing folder: ${folderPath}`;
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);

      const removeResult = await banbury.device.removeScannedFolder(folderPath);

      if (removeResult === 'success') {
        await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
        // Get fresh devices data first
        const updatedDevices = await banbury.device.fetchDeviceData();
        setDevices(Array.isArray(updatedDevices) ? updatedDevices : null);
        // Then get updated folders with fresh device data
        const updatedFolders = await getSyncFolders();
        setSyncData(updatedFolders);
      }
    } catch (error) {
      console.error('Error removing folder:', error);
    }
  };


  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
      />
      <Tooltip title="Sync">
        <Button
          onClick={handleClick}
          data-testid="sync-button"
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          <SyncIcon fontSize="inherit" />
        </Button>
      </Tooltip>
      {/* <ErrorAlert
        title="There were 2 errors with your submission"
        messages={[
          "Your password must be at least 8 characters",
          "Your password must include at least one pro wrestling finishing move"
        ]}
      /> */}

      <Popover
        data-testid="sync-popover"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            backgroundColor: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            mt: 1,
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
            '& .MuiTypography-root': {
              color: '#ffffff',
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Button
            data-testid="add-folder-button"
            onClick={triggerFolderSelect}
            disabled={isScanning || deviceNotFound}
            startIcon={<CreateNewFolderIcon fontSize="inherit" />}
            sx={{
              mr: 2, mb: 2, width: '100%',
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >
            <Typography fontSize="body1">Add Folder</Typography>
          </Button>

          <Stack spacing={2}>
            {/* Folders Section */}
            {syncData.syncingFiles.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Folders
                </Typography>
                {syncData.syncingFiles.map((file, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                      <FolderIcon />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" noWrap>{file.filename}</Typography>
                        {isScanning && file.speed && (
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            {file.speed}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {isScanning && (
                      <>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            minWidth: '35px',
                            textAlign: 'right',
                            mr: 1
                          }}
                        >
                          {`${Math.round(file.progress)}%`}
                        </Typography>
                        <Box sx={{ width: '100px' }}>
                          <LinearProgress
                            data-testid="progress-bar"
                            variant="determinate"
                            value={file.progress}
                            sx={{
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: '#ffffff'
                              }
                            }}
                          />
                        </Box>
                      </>
                    )}
                    <IconButton
                      data-testid="remove-folder-button"
                      onClick={() => handleRemoveFolder(file.filename)}
                      size="small"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        '&:hover': {
                          color: 'rgba(255, 255, 255, 0.8)',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)'
                        }
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </>
            )}

            {/* Loading status */}
            {syncData.syncingFiles.length === 0 && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: deviceNotFound ? '#ff6b6b' : '#2fca45',
                mt: 1
              }}>
                <Typography>
                  {deviceNotFound
                    ? 'Device not added.'
                    : isLoading
                      ? 'Loading...'
                      : 'No folders added.'}
                </Typography>
              </Box>
            )}
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              data-testid="scan-button"
              variant="contained"
              size="small"
              sx={{
                fontSize: '12px',
              }}
              onClick={handleSyncClick}
              disabled={isScanning || deviceNotFound}
              startIcon={<SearchIcon />}
            >
              {isScanning ? 'Scanning...' : 'Scan'}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}


