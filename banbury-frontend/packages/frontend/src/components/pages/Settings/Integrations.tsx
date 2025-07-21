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
const Google_Calendar_Icon = 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg'

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
  needsReauth?: boolean;
}

export default function Integrations() {
  const { tasks, setTasks, setTaskbox_expanded } = useAuth();
  const { showAlert } = useAlert();
  const [googleDriveStatus, setGoogleDriveStatus] = useState<GoogleDriveStatus>({
    enabled: false,
    configured: false,
    hasCredentials: false,
  });
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({
    enabled: false,
    configured: false,
    clientEmail: null,
  });
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<GoogleCalendarStatus>({
    enabled: false,
    configured: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showAccountExistsDialog, setShowAccountExistsDialog] = useState(false);
  const [showGmailConfigDialog, setShowGmailConfigDialog] = useState(false);
  const [showGmailDisableDialog, setShowGmailDisableDialog] = useState(false);
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
      // Check if Google Drive is already configured
      const googleDriveStatus = await banbury.settings.getGoogleDriveIntegrationStatus();
      if (googleDriveStatus.hasCredentials) {
        // Enable Google Calendar directly using existing Google credentials
        await enableGoogleCalendar();
      } else {
        // Prompt to set up Google Drive first
        showAlert(
          'Google Drive Required',
          ['Google Calendar requires Google authentication. Please configure Google Drive integration first to enable Google Calendar.'],
          'info'
        );
      }
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

  const enableGoogleCalendar = async () => {
    try {
      setIsUpdating(true);
      
      const task_description = 'Configuring Google Calendar Integration';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const response = await banbury.settings.enableGoogleCalendarIntegration();

      if (response.result === 'success') {
        await loadGoogleCalendarStatus();
        await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);
        showAlert('Success', [response.message || 'Google Calendar integration configured successfully'], 'success');
      } else {
        await banbury.sessions.failTask(taskInfo, response.message || 'Failed to configure Google Calendar integration', tasks || [], setTasks);
        showAlert('Error', [response.message || 'Failed to configure Google Calendar integration'], 'error');
      }
    } catch (error) {
      console.error('Error configuring Google Calendar:', error);
      showAlert(
        'Error',
        ['Failed to configure Google Calendar integration', error instanceof Error ? error.message : 'Unknown error'],
        'error'
      );
    } finally {
      setIsUpdating(false);
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
        description: 'View and manage your Google Calendar events directly from Banbury AI agent.',
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
        description: 'View and manage your Google Calendar events directly from Banbury AI agent.',
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

  return (
    <>
      {/* Show info about Gmail being active */}
      {gmailStatus.enabled && gmailStatus.configured && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Text className="text-sm">
            Gmail integration is active with email: <strong>{gmailStatus.clientEmail}</strong>. 
            You can now ask the AI agent to help with email management tasks.
          </Text>
        </Alert>
      )}

      {/* Show info about Google Calendar configuration */}
      {!googleCalendarStatus.enabled && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Text className="text-sm">
            <strong>Google Calendar Integration:</strong> Google Calendar uses the same Google API credentials as Google Drive. 
            {googleDriveStatus.hasCredentials 
              ? 'Since you have Google Drive configured, you can enable Google Calendar integration directly.'
              : 'Configure Google Drive integration first to enable Google Calendar functionality.'
            }
          </Text>
        </Alert>
      )}

      {/* Show info about Google Calendar being active */}
      {googleCalendarStatus.enabled && googleCalendarStatus.configured && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Text className="text-sm">
            Google Calendar integration is active. 
            You can now ask the AI agent to help with calendar management tasks.
          </Text>
        </Alert>
      )}

      {/* Show info about enabling Google Calendar API or re-authentication */}
      {googleDriveStatus.enabled && googleDriveStatus.configured && !googleCalendarStatus.enabled && (
        <Alert severity={googleCalendarStatus.needsReauth ? "warning" : "info"} sx={{ mt: 2 }}>
          <Text className="text-sm">
            {googleCalendarStatus.needsReauth ? (
              <>
                <strong>Google Calendar Scope Missing:</strong> Your Google credentials don't include Google Calendar permissions. You need to:
                <br />
                1. **Disable** your Google Drive integration (this removes old credentials)
                <br />
                2. **Re-enable** Google Drive integration (this will request Google Calendar permissions too)
                <br />
                3. **Configure** Google Calendar integration
                <br /><br />
                This happens when you authenticated before Google Calendar support was added.
              </>
            ) : (
              <>
                <strong>Enable Google Calendar API:</strong> You have Google Drive configured! To enable Google Calendar, you need to:
                <br />
                1. Go to <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Google Cloud Console</a>
                <br />
                2. Select the same project you used for Google Drive
                <br />
                3. Click "Enable" for the Google Calendar API
                <br />
                4. Return here and configure Google Calendar integration
              </>
            )}
          </Text>
        </Alert>
      )}

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
            • Google Drive integration will remain active
            <br /><br />
            You can re-enable it at any time.
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