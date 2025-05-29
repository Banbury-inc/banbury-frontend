import React, { useState } from 'react';
import { 
  Button, 
  Tooltip, 
  Popover, 
  Box, 
  Stack, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Typography,
  CircularProgress
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { useAuth } from '../../../../../../renderer/context/AuthContext';
import { useAlert } from '../../../../../../renderer/context/AlertContext';
import { addFileToSync } from '@banbury/core/src/device/addFileToSync';
import { uploadToGoogleDrive } from '@banbury/core/src/files/googleDrive';
import { uploadToS3 } from '@banbury/core/src/files/uploadToS3';
import banbury from '@banbury/core';
import fs from 'fs';
import { FileCopy, AddToDrive, CloudUploadOutlined} from '@mui/icons-material';

interface AddToButtonProps {
  selectedFileNames: string[];
  selectedFileInfo: any[];
  filePath?: string;
  onUploadComplete?: () => void;
}

// Helper function to convert file path to File object
const createFileFromPath = async (filePath: string): Promise<File> => {
  const fileName = filePath.split('/').pop() || 'unknown';
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
  return new File([blob], fileName);
};

export default function AddToButton({ 
  selectedFileNames, 
  selectedFileInfo,
  onUploadComplete 
}: AddToButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState({
    sync: false,
    googleDrive: false,
    s3: false
  });
  
  const { tasks, setTasks, setTaskbox_expanded, devices, setUpdates } = useAuth();
  const { showAlert } = useAlert();
  
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Check if files are selected
  const hasSelectedFiles = selectedFileNames && selectedFileNames.length > 0;

  // Add to Sync functionality
  const handleAddToSync = async () => {
    handleClose();
    
    if (!hasSelectedFiles) {
      showAlert(
        'No Files Selected',
        ['Please select a file first'],
        'warning'
      );
      return;
    }

    setLoading(prev => ({ ...prev, sync: true }));

    for (const file of selectedFileNames) {
      let taskInfo = null;
      try {
        const task_description = `Adding file to sync: ${file}`;
        taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
        setTaskbox_expanded(true);

        const addResult = await addFileToSync(file);

        if (addResult === 'success') {
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert('File Added to Sync', ['File added to sync'], 'success');
        } else {
          throw new Error(`Failed to add file: ${addResult}`);
        }
      } catch (error) {
        console.error('Error adding file to sync:', error);
        if (taskInfo) {
          await banbury.sessions.failTask(
            taskInfo,
            tasks,
            setTasks,
            error instanceof Error ? error.message : 'Unknown error occurred'
          );
        }
        showAlert(
          'Error Adding File to Sync',
          [error instanceof Error ? error.message : 'An unknown error occurred while adding file to sync'],
          'error'
        );
      }
    }

    setLoading(prev => ({ ...prev, sync: false }));
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  // Upload to Google Drive functionality
  const handleGoogleDriveUpload = async () => {
    handleClose();
    
    if (!hasSelectedFiles) {
      showAlert(
        'No Files Selected',
        ['Please select a file first'],
        'warning'
      );
      return;
    }

    setLoading(prev => ({ ...prev, googleDrive: true }));
    
    try {
      // Get file paths from selected file info
      const filePaths = selectedFileInfo
        .filter(file => file.file_path && file.file_path.trim() !== '')
        .map(file => file.file_path);

      if (filePaths.length === 0) {
        throw new Error('No valid file paths found for selected files');
      }

      let successCount = 0;
      let failCount = 0;

      for (const filePath of filePaths) {
        let taskInfo = null;
        try {
          const fileName = filePath.split('/').pop() || 'Unknown file';
          const task_description = `Uploading to Google Drive: ${fileName}`;
          taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
          setTaskbox_expanded(true);

          // Convert file path to File object and upload to Google Drive
          const fileObject = await createFileFromPath(filePath);
          const result = await uploadToGoogleDrive(fileObject);
          
          if (result && !result.error) {
            await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
            successCount++;
          } else {
            throw new Error(result?.error || 'Upload failed');
          }
        } catch (error) {
          console.error('Error uploading file to Google Drive:', error);
          if (taskInfo) {
            await banbury.sessions.failTask(
              taskInfo,
              tasks,
              setTasks,
              error instanceof Error ? error.message : 'Unknown error occurred'
            );
          }
          failCount++;
        }
      }

      // Show appropriate alert based on results
      if (failCount === 0) {
        showAlert('Upload Complete', ['All files successfully uploaded to Google Drive.'], 'success');
      } else if (successCount === 0) {
        showAlert('Upload Failed', ['All files failed to upload to Google Drive.'], 'error');
      } else {
        showAlert('Partial Upload Success', ['Some files failed to upload to Google Drive.'], 'warning');
      }
      
      setUpdates(Date.now());
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error uploading files to Google Drive:', error);
      showAlert('Upload Error', [(error as Error).message || 'Failed to upload files to Google Drive.'], 'error');
    } finally {
      setLoading(prev => ({ ...prev, googleDrive: false }));
    }
  };

  // Upload to S3/Cloud functionality
  const handleS3Upload = async () => {
    handleClose();
    
    if (!hasSelectedFiles) {
      showAlert(
        'No Files Selected',
        ['Please select a file first'],
        'warning'
      );
      return;
    }

    setLoading(prev => ({ ...prev, s3: true }));
    
    try {
      const deviceName = devices && devices.length > 0 ? devices[0].device_name : '';
      if (!deviceName) {
        throw new Error('No device found');
      }

      // Get file paths from selected file info
      const filePaths = selectedFileInfo
        .filter(file => file.file_path && file.file_path.trim() !== '')
        .map(file => file.file_path);

      if (filePaths.length === 0) {
        throw new Error('No valid file paths found for selected files');
      }

      let successCount = 0;
      let failCount = 0;

      for (const filePath of filePaths) {
        let taskInfo = null;
        try {
          const fileName = filePath.split('/').pop() || 'Unknown file';
          const task_description = `Uploading to Cloud: ${fileName}`;
          taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
          setTaskbox_expanded(true);

          // Convert file path to File object and upload to S3/Cloud
          const fileObject = await createFileFromPath(filePath);
          const result = await uploadToS3(fileObject, deviceName, filePath);
          
          if (result && !result.error) {
            await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
            successCount++;
          } else {
            throw new Error(result?.error || 'Upload failed');
          }
        } catch (error) {
          console.error('Error uploading file to Cloud:', error);
          if (taskInfo) {
            await banbury.sessions.failTask(
              taskInfo,
              tasks,
              setTasks,
              error instanceof Error ? error.message : 'Unknown error occurred'
            );
          }
          failCount++;
        }
      }

      // Show appropriate alert based on results
      if (failCount === 0) {
        showAlert('Upload Complete', ['All files successfully uploaded to Cloud.'], 'success');
      } else if (successCount === 0) {
        showAlert('Upload Failed', ['All files failed to upload to Cloud.'], 'error');
      } else {
        showAlert('Partial Upload Success', ['Some files failed to upload to Cloud.'], 'warning');
      }
      
      setUpdates(Date.now());
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error uploading files to Cloud:', error);
      showAlert('Upload Error', [(error as Error).message || 'Failed to upload files to Cloud.'], 'error');
    } finally {
      setLoading(prev => ({ ...prev, s3: false }));
    }
  };

  const isAnyLoading = loading.sync || loading.googleDrive || loading.s3;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Tooltip title="Add To">
        <Button
          data-testid="add-to-button"
          onClick={handleClick}
          disabled={isAnyLoading}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          {isAnyLoading ? (
            <CircularProgress 
              size={16} 
              sx={{ color: '#ffffff' }}
            />
          ) : (
            <FileCopy fontSize="inherit" />
          )}
        </Button>
      </Tooltip>
      
      <Popover
        data-testid="add-to-popover"
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
        <Box sx={{ py: 1 }}>
          <Typography variant="subtitle2" sx={{ px: 2, pb: 1, color: '#ffffff' }}>
            Add To
          </Typography>
          
          <Stack spacing={0}>
            <MenuItem 
              data-testid="add-to-sync-button"
              onClick={handleAddToSync}
              disabled={loading.sync}
              sx={{ 
                px: 2, 
                py: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {loading.sync ? (
                  <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                ) : (
                  <SyncIcon fontSize="small" sx={{ color: '#ffffff' }} />
                )}
              </ListItemIcon>
              <ListItemText>
                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                  {loading.sync ? 'Adding to Sync...' : 'Add to Sync'}
                </Typography>
              </ListItemText>
            </MenuItem>
            
            <MenuItem 
              data-testid="add-to-google-drive-button"
              onClick={handleGoogleDriveUpload}
              disabled={loading.googleDrive}
              sx={{ 
                px: 2, 
                py: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {loading.googleDrive ? (
                  <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                ) : (
                  <AddToDrive fontSize="small" sx={{ color: '#ffffff' }} />
                )}
              </ListItemIcon>
              <ListItemText>
                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                  {loading.googleDrive ? 'Uploading to Google Drive...' : 'Upload to Google Drive'}
                </Typography>
              </ListItemText>
            </MenuItem>
            
            <MenuItem 
              data-testid="add-to-cloud-button"
              onClick={handleS3Upload}
              disabled={loading.s3}
              sx={{ 
                px: 2, 
                py: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {loading.s3 ? (
                  <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                ) : (
                  <CloudUploadOutlined fontSize="small" sx={{ color: '#ffffff' }} />
                )}
              </ListItemIcon>
              <ListItemText>
                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                  {loading.s3 ? 'Uploading to Cloud...' : 'Upload to Cloud'}
                </Typography>
              </ListItemText>
            </MenuItem>
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
} 
