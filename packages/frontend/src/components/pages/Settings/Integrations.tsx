import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Stack, 
  Box, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Avatar,
  TextField
} from '@mui/material';
import { banbury } from '@banbury/core';
import { useAuth } from '../../../renderer/context/AuthContext';
import { useAlert } from '../../../renderer/context/AlertContext';
import { Text } from '../../common/Text/Text';
import { Button } from '../../common/Button/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import { Integration } from '@banbury/core/src/types';

const Google_Drive_Icon = 'https://raw.githubusercontent.com/Banbury-inc/banbury-frontend/dev/packages/frontend/static/Google_Drive_Icon.png'
const Gmail_Icon = 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico'
const Google_Calendar_Icon = 'https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_12_2x.png'

interface GoogleDriveStatus {
  enabled: boolean;
  configured: boolean;
  hasCredentials: boolean;
}

interface GmailStatus {
  enabled: boolean;
  configured: boolean;
  clientEmail: string | null;
  needsReauth?: boolean;
}

interface GoogleCalendarStatus {
  enabled: boolean;
  configured: boolean;
  hasCredentials: boolean;
}

interface AuthResponse {
  result: 'success' | 'error' | 'account_exists' | 'auth_required';
  authUrl?: string;
  message?: string;
  existingAccount?: {
    email: string;
    name: string;
  };
}



export default function Integrations() {
  const { tasks, setTasks, setTaskbox_expanded } = useAuth();
  const { showAlert } = useAlert();
  const [googleDriveStatus, setGoogleDriveStatus] = useState<GoogleDriveStatus>({
    enabled: false,
    configured: false,
    hasCredentials: false,
  });
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<GoogleCalendarStatus>({
    enabled: false,
    configured: false,
    hasCredentials: false,
  });
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({
    enabled: false,
    configured: false,
    clientEmail: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showAccountExistsDialog, setShowAccountExistsDialog] = useState(false);
  const [showGmailConfigDialog, setShowGmailConfigDialog] = useState(false);
  const [showGmailDisableDialog, setShowGmailDisableDialog] = useState(false);
  const [showGoogleCalendarConfigDialog, setShowGoogleCalendarConfigDialog] = useState(false);
  const [showGoogleCalendarDisableDialog, setShowGoogleCalendarDisableDialog] = useState(false);
  const [gmailClientEmail, setGmailClientEmail] = useState('');
  const [existingAccountInfo, setExistingAccountInfo] = useState<{email: string; name: string} | null>(null);
  const [pendingAuthUrl, setPendingAuthUrl] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  // Load integration statuses on component mount
  useEffect(() => {
    loadIntegrationStatuses();
  }, []);

  const loadIntegrationStatuses = async () => {
    try {
      setIsLoading(true);
      const [googleDriveStatus, gmailStatus, googleCalendarStatus] = await Promise.all([
        banbury.settings.getGoogleDriveIntegrationStatus(),
        banbury.settings.getGmailIntegrationStatus(),
        banbury.settings.getGoogleCalendarIntegrationStatus()
      ]);
      setGoogleDriveStatus(googleDriveStatus);
      setGmailStatus(gmailStatus);
      setGoogleCalendarStatus(googleCalendarStatus);
    } catch (error) {
      console.error('Error loading integration statuses:', error);
      showAlert(
        'Error',
        ['Failed to load integration statuses', error instanceof Error ? error.message : 'Unknown error'],
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoogleDriveStatus = async () => {
    try {
      const status = await banbury.settings.getGoogleDriveIntegrationStatus();
      setGoogleDriveStatus(status);
    } catch (error) {
      console.error('Error loading Google Drive status:', error);
    }
  };

  const loadGmailStatus = async () => {
    try {
      const status = await banbury.settings.getGmailIntegrationStatus();
      setGmailStatus(status);
      if (status.clientEmail) {
        setGmailClientEmail(status.clientEmail);
      }
    } catch (error) {
      console.error('Error loading Gmail status:', error);
    }
  };

  const loadGoogleCalendarStatus = async () => {
    try {
      const status = await banbury.settings.getGoogleCalendarIntegrationStatus();
      setGoogleCalendarStatus(status);
    } catch (error) {
      console.error('Error loading Google Calendar status:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleConfigureIntegration = async (integrationId: string) => {
    if (integrationId === 'google-drive') {
      await enableGoogleDrive();
    } else if (integrationId === 'gmail') {
      // Check if Google Drive is already configured
      const googleDriveStatus = await banbury.settings.getGoogleDriveIntegrationStatus();
      if (googleDriveStatus.hasCredentials) {
        // Enable Gmail directly using existing Google credentials
        await enableGmail();
      } else {
        // Show dialog to configure email or prompt to set up Google Drive first
        setShowGmailConfigDialog(true);
      }
    } else if (integrationId === 'google-calendar') {
      await enableGoogleCalendar();
    }
  };

  const handleDisableIntegration = async (integrationId: string) => {
    if (integrationId === 'google-drive') {
      setShowDisableDialog(true);
    } else if (integrationId === 'gmail') {
      setShowGmailDisableDialog(true);
    } else if (integrationId === 'google-calendar') {
      setShowGoogleCalendarDisableDialog(true);
    }
  };

  const enableGoogleDrive = async () => {
    try {
      setIsUpdating(true);
      const task_description = 'Enabling Google Drive Integration';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const response = await banbury.settings.enableGoogleDriveIntegration() as AuthResponse;

      if (response.result === 'success') {
        // Integration completed successfully (either with existing credentials or after OAuth)
        await loadGoogleDriveStatus();
        await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);
        showAlert(
          'Success', 
          [response.message || 'Google Drive integration enabled successfully'], 
          'success'
        );
      } else if (response.result === 'account_exists') {
        // Handle case where account already exists
        await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);
        setExistingAccountInfo(response.existingAccount || { email: 'Unknown', name: 'Unknown' });
        setPendingAuthUrl(response.authUrl || null);
        setShowAccountExistsDialog(true);
      } else {
        await banbury.sessions.failTask(taskInfo, response.message || 'Failed to enable Google Drive integration', tasks || [], setTasks);
        showAlert('Error', [response.message || 'Failed to enable Google Drive integration'], 'error');
      }
    } catch (error) {
      console.error('Error enabling Google Drive:', error);
      
      // Determine the appropriate error message
      let errorMessage = 'Failed to enable Google Drive integration';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // If there's a task in progress, fail it
      try {
        const task_description = 'Enabling Google Drive Integration';
        const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
        await banbury.sessions.failTask(taskInfo, errorMessage, tasks || [], setTasks);
      } catch (taskError) {
        console.error('Error failing task:', taskError);
      }
      
      showAlert(
        'Error',
        [errorMessage],
        'error'
      );
    } finally {
      setIsUpdating(false);
      // Reload status in case of partial success
      await loadGoogleDriveStatus();
    }
  };

  const handleAuthentication = async (authUrl: string, taskInfo?: any) => {
    try {
      // Open authentication window
      const authWindow = window.open(
        authUrl,
        'google_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        throw new Error('Failed to open authentication window. Please check your popup blocker settings.');
      }

      // Monitor the auth window
      const checkClosed = setInterval(async () => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          
          // Wait a moment for the backend to process the auth callback
          setTimeout(async () => {
            await loadGoogleDriveStatus();
            
            // Check if authentication was successful
            const updatedStatus = await banbury.settings.getGoogleDriveIntegrationStatus();
            
            if (updatedStatus.enabled && updatedStatus.configured) {
              if (taskInfo) {
                await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);
              }
              showAlert(
                'Success',
                ['Google Drive integration enabled and authenticated successfully'],
                'success'
              );
            } else {
              if (taskInfo) {
                await banbury.sessions.failTask(taskInfo, 'Authentication was not completed', tasks || [], setTasks);
              }
              showAlert(
                'Authentication Incomplete',
                ['Google authentication was not completed. Please try again.'],
                'warning'
              );
            }
          }, 2000);
        }
      }, 1000);

      showAlert(
        'Authentication Required',
        [
          'Please complete the Google authentication in the popup window.',
          'After authentication, your Google Drive integration will be enabled.'
        ],
        'info'
      );
    } catch (error) {
      console.error('Error during authentication:', error);
      if (taskInfo) {
        await banbury.sessions.failTask(taskInfo, 'Authentication failed', tasks || [], setTasks);
      }
      showAlert(
        'Authentication Error',
        [error instanceof Error ? error.message : 'Failed to open authentication window'],
        'error'
      );
    }
  };

  const handleExistingAccountChoice = async (choice: 'link' | 'cancel') => {
    setShowAccountExistsDialog(false);
    
    if (choice === 'link' && pendingAuthUrl) {
      const task_description = 'Linking Google Account to Drive Integration';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);
      
      await handleAuthentication(pendingAuthUrl, taskInfo);
    }
    
    // Clean up
    setExistingAccountInfo(null);
    setPendingAuthUrl(null);
  };

  const enableGmail = async () => {
    try {
      setIsUpdating(true);
      setShowGmailConfigDialog(false);
      
      const task_description = 'Configuring Gmail Integration';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      // Try to enable Gmail with existing Google credentials
      const clientEmail = gmailClientEmail.trim();
      const response = await banbury.settings.enableGmailIntegration(clientEmail || '');

      if (response.result === 'success') {
        await loadGmailStatus();
        await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);
        showAlert('Success', [response.message || 'Gmail integration configured successfully'], 'success');
      } else {
        await banbury.sessions.failTask(taskInfo, response.message || 'Failed to configure Gmail integration', tasks || [], setTasks);
        showAlert('Error', [response.message || 'Failed to configure Gmail integration'], 'error');
      }
    } catch (error) {
      console.error('Error configuring Gmail:', error);
      showAlert(
        'Error',
        ['Failed to configure Gmail integration', error instanceof Error ? error.message : 'Unknown error'],
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
        await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);
        showAlert('Success', ['Google Drive integration disabled successfully'], 'success');
      } else {
        await banbury.sessions.failTask(taskInfo, 'Failed to disable Google Drive integration', tasks || [], setTasks);
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

  const disableGmail = async () => {
    try {
      setIsUpdating(true);
      setShowGmailDisableDialog(false);
      
      const task_description = 'Disabling Gmail Integration';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const response = await banbury.settings.disableGmailIntegration();

      if (response.result === 'success') {
        await loadGmailStatus();
        setGmailClientEmail('');
        await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);
        showAlert('Success', [response.message || 'Gmail integration disabled successfully'], 'success');
      } else {
        await banbury.sessions.failTask(taskInfo, response.message || 'Failed to disable Gmail integration', tasks || [], setTasks);
        showAlert('Error', [response.message || 'Failed to disable Gmail integration'], 'error');
      }
    } catch (error) {
      console.error('Error disabling Gmail:', error);
      showAlert(
        'Error',
        ['Failed to disable Gmail integration', error instanceof Error ? error.message : 'Unknown error'],
        'error'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const enableGoogleCalendar = async () => {
    try {
      setIsUpdating(true);
      setShowGoogleCalendarConfigDialog(false);
      
      const task_description = 'Enabling Google Calendar Integration';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const response = await banbury.settings.enableGoogleCalendarIntegration() as AuthResponse;

      if (response.result === 'success') {
        await loadGoogleCalendarStatus();
        await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);
        showAlert(
          'Success', 
          [response.message || 'Google Calendar integration enabled successfully'], 
          'success'
        );
      } else if (response.result === 'account_exists') {
        await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);
        setExistingAccountInfo(response.existingAccount || { email: 'Unknown', name: 'Unknown' });
        setPendingAuthUrl(response.authUrl || null);
        setShowAccountExistsDialog(true);
      } else {
        await banbury.sessions.failTask(taskInfo, response.message || 'Failed to enable Google Calendar integration', tasks || [], setTasks);
        showAlert('Error', [response.message || 'Failed to enable Google Calendar integration'], 'error');
      }
    } catch (error) {
      console.error('Error enabling Google Calendar:', error);
      
      let errorMessage = 'Failed to enable Google Calendar integration';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      try {
        const task_description = 'Enabling Google Calendar Integration';
        const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
        await banbury.sessions.failTask(taskInfo, errorMessage, tasks || [], setTasks);
      } catch (taskError) {
        console.error('Error failing task:', taskError);
      }
      
      showAlert(
        'Error',
        [errorMessage],
        'error'
      );
    } finally {
      setIsUpdating(false);
      await loadGoogleCalendarStatus();
    }
  };

  const disableGoogleCalendar = async () => {
    try {
      setIsUpdating(true);
      setShowGoogleCalendarDisableDialog(false);
      
      const task_description = 'Disabling Google Calendar Integration';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const response = await banbury.settings.disableGoogleCalendarIntegration();

      if (response.result === 'success') {
        await loadGoogleCalendarStatus();
        await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);
        showAlert('Success', [response.message || 'Google Calendar integration disabled successfully'], 'success');
      } else {
        await banbury.sessions.failTask(taskInfo, response.message || 'Failed to disable Google Calendar integration', tasks || [], setTasks);
        showAlert('Error', [response.message || 'Failed to disable Google Calendar integration'], 'error');
      }
    } catch (error) {
      console.error('Error disabling Google Calendar:', error);
      showAlert(
        'Error',
        ['Failed to disable Google Calendar integration', error instanceof Error ? error.message : 'Unknown error'],
        'error'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const getGoogleDriveStatusChip = () => {
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

  const getGmailStatusChip = () => {
    if (isLoading) {
      return <Chip label="Loading..." size="small" />;
    }

    if (gmailStatus.enabled && gmailStatus.configured) {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Active"
          color="success"
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

  const getGoogleCalendarStatusChip = () => {
    if (isLoading) {
      return <Chip label="Loading..." size="small" />;
    }

    if (googleCalendarStatus.enabled && googleCalendarStatus.configured) {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Active"
          color="success"
          size="small"
        />
      );
    }

    if (googleCalendarStatus.enabled && !googleCalendarStatus.configured) {
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

  // Get installed integrations
  const getInstalledIntegrations = () => {
    const integrations = [];
    
    // Add Google Drive if it's enabled and configured
    if (googleDriveStatus.enabled && googleDriveStatus.configured) {
      integrations.push({
        id: 'google-drive',
        name: 'Google Drive',
        description: 'Access and sync your Google Drive files directly from Banbury.',
        icon: <img src={Google_Drive_Icon} alt="Google Drive" className="w-8 h-8" />,
        category: 'Cloud Storage',
        status: 'installed' as const,
        configured: true,
        enabled: true
      });
    }

    // Add Gmail if it's enabled and configured
    if (gmailStatus.enabled && gmailStatus.configured) {
      integrations.push({
        id: 'gmail',
        name: 'Gmail',
        description: 'Access and manage your Gmail emails directly from Banbury AI agent.',
        icon: <img src={Gmail_Icon} alt="Gmail" className="w-8 h-8" />,
        category: 'Email',
        status: 'installed' as const,
        configured: true,
        enabled: true
      });
    }

    // Add Google Calendar if it's enabled and configured
    if (googleCalendarStatus.enabled && googleCalendarStatus.configured) {
      integrations.push({
        id: 'google-calendar',
        name: 'Google Calendar',
        description: 'Access and manage your Google Calendar events directly from Banbury AI agent.',
        icon: <img src={Google_Calendar_Icon} alt="Google Calendar" className="w-8 h-8" />,
        category: 'Calendar',
        status: 'installed' as const,
        configured: true,
        enabled: true
      });
    }
    
    return integrations;
  };

  // Get available integrations (including unconfigured integrations)
  const getAvailableIntegrations = () => {
    const integrations = [];
    
    // Add Google Drive if it's not configured yet
    if (!googleDriveStatus.enabled || !googleDriveStatus.configured) {
      integrations.push({
        id: 'google-drive',
        name: 'Google Drive',
        description: 'Access and sync your Google Drive files directly from Banbury.',
        icon: <img src={Google_Drive_Icon} alt="Google Drive" className="w-8 h-8" />,
        category: 'Cloud Storage',
        status: 'available' as const,
        configured: googleDriveStatus.configured,
        enabled: googleDriveStatus.enabled
      });
    }

    // Add Gmail if it's not configured yet
    if (!gmailStatus.enabled || !gmailStatus.configured) {
      integrations.push({
        id: 'gmail',
        name: 'Gmail',
        description: 'Access and manage your Gmail emails directly from Banbury AI agent.',
        icon: <img src={Gmail_Icon} alt="Gmail" className="w-8 h-8" />,
        category: 'Email',
        status: 'available' as const,
        configured: gmailStatus.configured,
        enabled: gmailStatus.enabled
      });
    }

    // Add Google Calendar if it's not configured yet
    if (!googleCalendarStatus.enabled || !googleCalendarStatus.configured) {
      integrations.push({
        id: 'google-calendar',
        name: 'Google Calendar',
        description: 'Access and manage your Google Calendar events directly from Banbury AI agent.',
        icon: <img src={Google_Calendar_Icon} alt="Google Calendar" className="w-8 h-8" />,
        category: 'Calendar',
        status: 'available' as const,
        configured: googleCalendarStatus.configured,
        enabled: googleCalendarStatus.enabled
      });
    }
    
    return integrations;
  };

  const renderIntegrationCard = (integration: Integration, isInstalled: boolean) => (
    <Card
      key={integration.id}
      variant="outlined"
      sx={{
        p: 3,
        mb: 2,
        '&:hover': {
          boxShadow: 2,
        },
      }}
    >
      <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ flex: '1', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 48, height: 48, bgcolor: 'transparent' }}>
            {integration.icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Text className="text-lg font-semibold">{integration.name}</Text>
              {isInstalled && integration.id === 'google-drive' && getGoogleDriveStatusChip()}
              {isInstalled && integration.id === 'gmail' && getGmailStatusChip()}
              {isInstalled && integration.id === 'google-calendar' && getGoogleCalendarStatusChip()}
              {!isInstalled && (
                <Chip
                  label={integration.category}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
            <Text className="text-sm text-gray-500 mb-1">
              {integration.description}
            </Text>
            {integration.id === 'google-drive' && integration.enabled && !integration.configured && (
              <Text className="text-xs text-orange-600">
                Authentication required to complete setup
              </Text>
            )}
            {integration.id === 'google-calendar' && integration.enabled && !integration.configured && (
              <Text className="text-xs text-orange-600">
                Authentication required to complete setup
              </Text>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isInstalled ? (
            <Button
              onClick={() => handleDisableIntegration(integration.id)}
              disabled={isLoading || isUpdating}
              outline
            >
              Disable
            </Button>
          ) : (
            <Button
              onClick={() => handleConfigureIntegration(integration.id)}
              disabled={isLoading || isUpdating}
            >
              Configure
            </Button>
          )}
        </Box>
      </Stack>
    </Card>
  );

  const installedIntegrations = getInstalledIntegrations();
  const availableIntegrationsData = getAvailableIntegrations();

  return (
    <>
      <Text id="integrations" className="text-2xl font-bold mb-4">Integrations</Text>

      <Card variant='outlined' sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={handleTabChange} aria-label="integration tabs">
            <Tab 
              label={`Installed Integrations (${installedIntegrations.length})`} 
              sx={{ textTransform: 'none', fontSize: '0.9rem' }}
            />
            <Tab 
              label={`Available Integrations (${availableIntegrationsData.length})`} 
              sx={{ textTransform: 'none', fontSize: '0.9rem' }}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Loading indicator during updates */}
          {isUpdating && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress />
            </Box>
          )}

          {selectedTab === 0 && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Text className="text-sm text-gray-600">
                  Integrations that are currently active and configured for your account.
                </Text>
              </Box>
              
              {installedIntegrations.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <IntegrationInstructionsIcon sx={{ fontSize: 48, color: 'gray', mb: 2 }} />
                  <Text className="text-lg font-medium text-gray-500 mb-1">
                    No installed integrations
                  </Text>
                  <Text className="text-sm text-gray-400">
                    Configure integrations from the Available tab to get started.
                  </Text>
                </Box>
              ) : (
                <Stack spacing={0}>
                  {installedIntegrations.map((integration) => 
                    renderIntegrationCard(integration, true)
                  )}
                </Stack>
              )}
            </Box>
          )}

          {selectedTab === 1 && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Text className="text-sm text-gray-600">
                  Available integrations you can configure to enhance your Banbury experience.
                </Text>
              </Box>
              
              <Stack spacing={0}>
                {availableIntegrationsData.map((integration) => 
                  renderIntegrationCard(integration, false)
                )}
              </Stack>
            </Box>
          )}
        </Box>
      </Card>

      {/* Show additional info if Google Drive needs authentication */}
      {googleDriveStatus.enabled && !googleDriveStatus.configured && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Text className="text-sm">
            Google Drive integration requires authentication. 
            Click "Configure" to complete the authentication process and link your Google account.
          </Text>
        </Alert>
      )}

      {/* Show info about authentication process for unconfigured Google Drive */}
      {!googleDriveStatus.enabled && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Text className="text-sm">
            <strong>Google Drive Integration:</strong> If you signed in to Banbury with Google, you may already have Google Drive access. 
            Click "Configure" to enable the integration. If you don't have Google credentials yet, the authentication process will open in your default browser.
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

      {/* Show info about Gmail configuration */}
      {!gmailStatus.enabled && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Text className="text-sm">
            <strong>Gmail Integration:</strong> Gmail uses the same Google API credentials as Google Drive. 
            {googleDriveStatus.hasCredentials 
              ? 'Since you have Google Drive configured, you can enable Gmail integration directly.'
              : 'Configure Google Drive integration first to enable Gmail functionality.'
            }
          </Text>
        </Alert>
      )}

      {/* Show info about Gmail being active */}
      {gmailStatus.enabled && gmailStatus.configured && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Text className="text-sm">
            Gmail integration is active with email: <strong>{gmailStatus.clientEmail}</strong>. 
            You can now ask the AI agent to help with email management tasks.
          </Text>
        </Alert>
      )}

      {/* Show info about Google Calendar authentication */}
      {googleCalendarStatus.enabled && !googleCalendarStatus.configured && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Text className="text-sm">
            Google Calendar integration requires authentication. 
            Click "Configure" to complete the authentication process and link your Google account.
          </Text>
        </Alert>
      )}

      {/* Show info about Google Calendar configuration */}
      {!googleCalendarStatus.enabled && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Text className="text-sm">
            <strong>Google Calendar Integration:</strong> If you signed in to Banbury with Google, you may already have Google Calendar access. 
            Click "Configure" to enable the integration. If you don't have Google credentials yet, the authentication process will open in your default browser.
          </Text>
        </Alert>
      )}

      {/* Show info about Google Calendar being active */}
      {googleCalendarStatus.enabled && googleCalendarStatus.configured && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Text className="text-sm">
            Google Calendar integration is active. 
            You can now ask the AI agent to help with calendar management tasks, view events, and schedule meetings.
          </Text>
        </Alert>
      )}

      {/* Show info about enabling Gmail API or re-authentication */}
      {googleDriveStatus.enabled && googleDriveStatus.configured && !gmailStatus.enabled && (
        <Alert severity={gmailStatus.needsReauth ? "warning" : "info"} sx={{ mt: 2 }}>
          <Text className="text-sm">
            {gmailStatus.needsReauth ? (
              <>
                <strong>Gmail Scope Missing:</strong> Your Google credentials don't include Gmail permissions. You need to:
                <br />
                1. **Disable** your Google Drive integration (this removes old credentials)
                <br />
                2. **Re-enable** Google Drive integration (this will request Gmail permissions too)
                <br />
                3. **Configure** Gmail integration
                <br /><br />
                This happens when you authenticated before Gmail support was added.
              </>
            ) : (
              <>
                <strong>Enable Gmail API:</strong> You have Google Drive configured! To enable Gmail, you need to:
                <br />
                1. Go to <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Google Cloud Console</a>
                <br />
                2. Select the same project you used for Google Drive
                <br />
                3. Click "Enable" for the Gmail API
                <br />
                4. Return here and configure Gmail integration
              </>
            )}
          </Text>
        </Alert>
      )}

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
            <br />
            • Disable access to your Google Drive files
            <br />
            • Remove stored authentication credentials
            <br /><br />
            You can re-enable it at any time, but you'll need to authenticate again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDisableDialog(false)}>
            Cancel
          </Button>
          <Button onClick={disableGoogleDrive}>
            Disable Integration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Already Exists Dialog */}
      <Dialog
        open={showAccountExistsDialog}
        onClose={() => handleExistingAccountChoice('cancel')}
        aria-labelledby="account-exists-dialog-title"
        aria-describedby="account-exists-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="account-exists-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="info" />
            Link Existing Google Account
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="account-exists-dialog-description">
            The Google account <strong>{existingAccountInfo?.email}</strong> ({existingAccountInfo?.name}) 
            is already associated with your Banbury account.
            <br /><br />
            Would you like to link this account to Google Drive integration? This will allow you to:
            <br />
            • Access your Google Drive files in the file browser
            <br />
            • Upload and download files directly to/from Google Drive
            <br />
            • Manage your Google Drive content within Banbury
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleExistingAccountChoice('cancel')}>
            Cancel
          </Button>
          <Button onClick={() => handleExistingAccountChoice('link')}>
            Link Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Gmail Configuration Dialog */}
      <Dialog
        open={showGmailConfigDialog}
        onClose={() => setShowGmailConfigDialog(false)}
        aria-labelledby="gmail-config-dialog-title"
        aria-describedby="gmail-config-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="gmail-config-dialog-title">
          Configure Gmail Integration
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="gmail-config-dialog-description" sx={{ mb: 2 }}>
            You need to set up Google Drive integration first to enable Gmail.
            Gmail uses the same Google API credentials as Google Drive.
          </DialogContentText>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Text className="text-sm">
              <strong>Option 1:</strong> Configure Google Drive integration first, then Gmail will automatically use the same credentials.
              <br />
              <strong>Option 2:</strong> Enter your Gmail address below for reference (optional).
            </Text>
          </Alert>
          
          <TextField
            margin="dense"
            id="gmail-client-email"
            label="Gmail Client Email (Optional)"
            type="email"
            fullWidth
            variant="outlined"
            value={gmailClientEmail}
            onChange={(e) => setGmailClientEmail(e.target.value)}
            placeholder="example@gmail.com"
            helperText="Optional: Enter your Gmail address for reference. Gmail will use your Google Drive credentials."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGmailConfigDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={enableGmail}
          >
            Configure Gmail
          </Button>
        </DialogActions>
      </Dialog>

      {/* Gmail Disable Confirmation Dialog */}
      <Dialog
        open={showGmailDisableDialog}
        onClose={() => setShowGmailDisableDialog(false)}
        aria-labelledby="gmail-disable-dialog-title"
        aria-describedby="gmail-disable-dialog-description"
      >
        <DialogTitle id="gmail-disable-dialog-title">
          Disable Gmail Integration?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="gmail-disable-dialog-description">
            Are you sure you want to disable Gmail integration? This will:
            <br />
            • Remove Gmail access from the AI agent
            <br />
            • Disable email management features
            <br />
            • Remove stored client email configuration
            <br /><br />
            You can re-enable it at any time by configuring a new client email.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGmailDisableDialog(false)}>
            Cancel
          </Button>
          <Button onClick={disableGmail}>
            Disable Gmail
          </Button>
        </DialogActions>
      </Dialog>

      {/* Google Calendar Configuration Dialog */}
      <Dialog
        open={showGoogleCalendarConfigDialog}
        onClose={() => setShowGoogleCalendarConfigDialog(false)}
        aria-labelledby="google-calendar-config-dialog-title"
        aria-describedby="google-calendar-config-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="google-calendar-config-dialog-title">
          Configure Google Calendar Integration
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="google-calendar-config-dialog-description" sx={{ mb: 2 }}>
            Enable Google Calendar integration to access and manage your calendar events directly from Banbury AI agent.
          </DialogContentText>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Text className="text-sm">
              Google Calendar integration uses the same Google API credentials as Google Drive. 
              If you have Google Drive configured, Calendar will use the same authentication.
            </Text>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGoogleCalendarConfigDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={enableGoogleCalendar}
          >
            Configure Google Calendar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Google Calendar Disable Confirmation Dialog */}
      <Dialog
        open={showGoogleCalendarDisableDialog}
        onClose={() => setShowGoogleCalendarDisableDialog(false)}
        aria-labelledby="google-calendar-disable-dialog-title"
        aria-describedby="google-calendar-disable-dialog-description"
      >
        <DialogTitle id="google-calendar-disable-dialog-title">
          Disable Google Calendar Integration?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="google-calendar-disable-dialog-description">
            Are you sure you want to disable Google Calendar integration? This will:
            <br />
            • Remove Google Calendar access from the AI agent
            <br />
            • Disable calendar management features
            <br />
            • Remove stored calendar configuration
            <br /><br />
            You can re-enable it at any time by configuring the integration again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGoogleCalendarDisableDialog(false)}>
            Cancel
          </Button>
          <Button onClick={disableGoogleCalendar}>
            Disable Google Calendar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 
