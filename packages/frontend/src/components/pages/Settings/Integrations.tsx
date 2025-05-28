import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Grid, 
  Stack, 
  Box, 
  Divider, 
  Switch, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip
} from '@mui/material';
import { banbury } from '@banbury/core';
import { useAuth } from '../../../renderer/context/AuthContext';
import { useAlert } from '../../../renderer/context/AlertContext';
import { Text } from '../../common/Text/Text';
import { Button } from '../../common/Button/Button';
import Google_Drive_Icon from '../../../../static/Google_Drive_Icon.png';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

interface GoogleDriveStatus {
  enabled: boolean;
  configured: boolean;
  hasCredentials: boolean;
}

export default function Integrations() {
  const { tasks, setTasks, setTaskbox_expanded } = useAuth();
  const { showAlert } = useAlert();
  const [googleDriveStatus, setGoogleDriveStatus] = useState<GoogleDriveStatus>({
    enabled: false,
    configured: false,
    hasCredentials: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  // Load Google Drive integration status on component mount
  useEffect(() => {
    loadGoogleDriveStatus();
  }, []);

  const loadGoogleDriveStatus = async () => {
    try {
      setIsLoading(true);
      const status = await banbury.settings.getGoogleDriveIntegrationStatus();
      setGoogleDriveStatus(status);
    } catch (error) {
      console.error('Error loading Google Drive status:', error);
      showAlert(
        'Error',
        ['Failed to load Google Drive integration status', error instanceof Error ? error.message : 'Unknown error'],
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleDriveToggle = async (enabled: boolean) => {
    if (!enabled && googleDriveStatus.enabled) {
      // Show confirmation dialog for disabling
      setShowDisableDialog(true);
      return;
    }

    if (enabled) {
      await enableGoogleDrive();
    }
  };

  const enableGoogleDrive = async () => {
    try {
      setIsUpdating(true);
      const task_description = 'Enabling Google Drive Integration';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const response = await banbury.settings.enableGoogleDriveIntegration();

      if (response.result === 'success') {
        if (response.authUrl) {
          // Open authentication window
          const authWindow = window.open(
            response.authUrl,
            'google_auth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
          );

          // Monitor the auth window
          const checkClosed = setInterval(() => {
            if (authWindow?.closed) {
              clearInterval(checkClosed);
              // Reload status after auth window closes
              setTimeout(() => {
                loadGoogleDriveStatus();
              }, 1000);
            }
          }, 1000);

          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert(
            'Authentication Required',
            [
              'Please complete the Google authentication in the popup window.',
              'After authentication, your Google Drive integration will be enabled.'
            ],
            'info'
          );
        } else {
          // Integration enabled without needing auth
          await loadGoogleDriveStatus();
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert('Success', ['Google Drive integration enabled successfully'], 'success');
        }
      } else {
        await banbury.sessions.failTask(taskInfo, 'Failed to enable Google Drive integration', tasks, setTasks);
        showAlert('Error', ['Failed to enable Google Drive integration'], 'error');
      }
    } catch (error) {
      console.error('Error enabling Google Drive:', error);
      showAlert(
        'Error',
        ['Failed to enable Google Drive integration', error instanceof Error ? error.message : 'Unknown error'],
        'error'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const disableGoogleDrive = async () => {
    try {
      setIsUpdating(true);
      setShowDisableDialog(false);
      
      const task_description = 'Disabling Google Drive Integration';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const response = await banbury.settings.disableGoogleDriveIntegration();

      if (response.result === 'success') {
        await loadGoogleDriveStatus();
        await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
        showAlert('Success', ['Google Drive integration disabled successfully'], 'success');
      } else {
        await banbury.sessions.failTask(taskInfo, 'Failed to disable Google Drive integration', tasks, setTasks);
        showAlert('Error', ['Failed to disable Google Drive integration'], 'error');
      }
    } catch (error) {
      console.error('Error disabling Google Drive:', error);
      showAlert(
        'Error',
        ['Failed to disable Google Drive integration', error instanceof Error ? error.message : 'Unknown error'],
        'error'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusChip = () => {
    if (isLoading) {
      return <Chip label="Loading..." size="small" />;
    }

    if (googleDriveStatus.enabled && googleDriveStatus.configured) {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Active"
          color="success"
          size="small"
        />
      );
    }

    if (googleDriveStatus.enabled && !googleDriveStatus.configured) {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Authentication Required"
          color="warning"
          size="small"
        />
      );
    }

    return (
      <Chip
        icon={<ErrorIcon />}
        label="Inactive"
        color="default"
        size="small"
      />
    );
  };

  const getStatusDescription = () => {
    if (isLoading) {
      return 'Loading integration status...';
    }

    if (googleDriveStatus.enabled && googleDriveStatus.configured) {
      return 'Google Drive is connected and ready to use. You can access your Google Drive files in the file browser.';
    }

    if (googleDriveStatus.enabled && !googleDriveStatus.configured) {
      return 'Google Drive integration is enabled but requires authentication. Please complete the authentication process.';
    }

    return 'Google Drive integration is disabled. Enable it to access your Google Drive files directly from Banbury.';
  };

  return (
    <>
      <Text id="integrations" className="text-2xl font-bold mb-2">Integrations</Text>

      <Card variant='outlined' sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Stack spacing={2} sx={{ width: '100%' }}>
                  <Box sx={{ pr: 3, pb: 2 }}>
                    <Text className="text-lg font-semibold mb-1">Third-party Integrations</Text>
                    <Text className="text-xs text-gray-500">
                      Connect external services to enhance your Banbury experience. 
                      Manage which services you want to integrate with your account.
                    </Text>
                  </Box>

                  {/* Google Drive Integration */}
                  <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ flex: '1', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <img src={Google_Drive_Icon} alt="Google Drive" className="w-10 h-10" />
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Text className="text-lg font-semibold">Google Drive</Text>
                          {getStatusChip()}
                        </Box>
                        <Text className="text-xs text-gray-500">
                          {getStatusDescription()}
                        </Text>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Switch
                        checked={googleDriveStatus.enabled}
                        onChange={(e) => handleGoogleDriveToggle(e.target.checked)}
                        disabled={isLoading || isUpdating}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            '&:hover': {
                              backgroundColor: 'rgba(76, 175, 80, 0.08)',
                            },
                          },
                          '& .MuiSwitch-thumb': {
                            backgroundColor: '#fff',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#2fca45',
                          },
                        }}
                      />
                    </Box>
                  </Stack>

                  {/* Show additional info if Google Drive is enabled but not configured */}
                  {googleDriveStatus.enabled && !googleDriveStatus.configured && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Text className="text-sm">
                        Google Drive integration is enabled but requires authentication. 
                        Click the toggle again to complete the authentication process.
                      </Text>
                    </Alert>
                  )}

                  {/* Show info about file tree visibility */}
                  {googleDriveStatus.enabled && googleDriveStatus.configured && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Text className="text-sm">
                        Google Drive files are now accessible in the file browser under "Core → Google Drive". 
                        You can browse, upload, and download files directly from your Google Drive.
                      </Text>
                    </Alert>
                  )}

                  <Divider />

                  {/* Future integrations placeholder */}
                  <Box sx={{ py: 2 }}>
                    <Text className="text-sm text-gray-500 text-center">
                      More integrations coming soon...
                    </Text>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* Disable Confirmation Dialog */}
      <Dialog
        open={showDisableDialog}
        onClose={() => setShowDisableDialog(false)}
        aria-labelledby="disable-dialog-title"
        aria-describedby="disable-dialog-description"
      >
        <DialogTitle id="disable-dialog-title">
          Disable Google Drive Integration?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="disable-dialog-description">
            Are you sure you want to disable Google Drive integration? This will:
            <br />
            • Remove Google Drive from the file browser
            • Disable access to your Google Drive files
            • Remove stored authentication credentials
            <br /><br />
            You can re-enable it at any time, but you'll need to authenticate again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDisableDialog(false)}>
            Cancel
          </Button>
          <Button onClick={disableGoogleDrive} autoFocus>
            Disable Integration
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 