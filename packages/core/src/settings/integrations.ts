// Local storage keys for integration settings
const STORAGE_KEYS = {
  GOOGLE_DRIVE_ENABLED: 'banbury_google_drive_enabled',
  GOOGLE_DRIVE_CONFIGURED: 'banbury_google_drive_configured',
} as const;

export interface Integration {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  icon?: string;
  settings?: Record<string, any>;
}

export interface IntegrationsResponse {
  result: string;
  integrations: Integration[];
}

/**
 * Get all available integrations and their status
 */
export const getIntegrations = async (): Promise<IntegrationsResponse> => {
  const googleDriveStatus = await getGoogleDriveIntegrationStatus();
  
  return {
    result: 'success',
    integrations: [
      {
        id: 'google_drive',
        name: 'Google Drive',
        description: 'Access your Google Drive files directly from Banbury',
        enabled: googleDriveStatus.enabled,
        configured: googleDriveStatus.configured,
        icon: 'cloud',
      }
    ]
  };
};

/**
 * Update integration status (enable/disable)
 */
export const updateIntegrationStatus = async (
  integrationId: string,
  enabled: boolean
): Promise<{ result: string; message?: string }> => {
  if (integrationId === 'google_drive') {
    if (enabled) {
      return await enableGoogleDriveIntegration();
    } else {
      return await disableGoogleDriveIntegration();
    }
  }
  
  return {
    result: 'error',
    message: `Unknown integration: ${integrationId}`
  };
};

/**
 * Get Google Drive integration status from local storage
 */
export const getGoogleDriveIntegrationStatus = async (): Promise<{
  enabled: boolean;
  configured: boolean;
  hasCredentials: boolean;
}> => {
  try {
    const enabled = localStorage.getItem(STORAGE_KEYS.GOOGLE_DRIVE_ENABLED) === 'true';
    const configured = localStorage.getItem(STORAGE_KEYS.GOOGLE_DRIVE_CONFIGURED) === 'true';
    
    // Check if user has Google Drive credentials by trying to list files
    let hasCredentials = false;
    if (enabled) {
      try {
        // Import the Google Drive functions to test credentials
        const { listGoogleDriveFiles } = await import('../files/googleDrive');
        await listGoogleDriveFiles();
        hasCredentials = true;
      } catch (error) {
        // If we get an auth error, credentials exist but may be expired
        // If we get a different error, no credentials
        if (error instanceof Error && error.message.includes('GOOGLE_DRIVE_AUTH_REQUIRED')) {
          hasCredentials = false;
        } else {
          hasCredentials = false;
        }
      }
    }
    
    return {
      enabled,
      configured: enabled && hasCredentials,
      hasCredentials,
    };
  } catch (error) {
    console.error('Error getting Google Drive integration status:', error);
    return {
      enabled: false,
      configured: false,
      hasCredentials: false,
    };
  }
};

/**
 * Enable Google Drive integration
 */
export const enableGoogleDriveIntegration = async (): Promise<{ result: string; authUrl?: string }> => {
  try {
    // Set enabled flag in local storage
    localStorage.setItem(STORAGE_KEYS.GOOGLE_DRIVE_ENABLED, 'true');
    
    // Check if user already has credentials
    const status = await getGoogleDriveIntegrationStatus();
    
    if (status.hasCredentials) {
      // User already has valid credentials
      localStorage.setItem(STORAGE_KEYS.GOOGLE_DRIVE_CONFIGURED, 'true');
      return {
        result: 'success'
      };
    } else {
      // User needs to authenticate - provide Google OAuth URL
      const authUrl = `${window.location.origin}/authentication/auth/google?redirect_uri=${encodeURIComponent(window.location.origin + '/authentication/auth/callback')}`;
      
      return {
        result: 'success',
        authUrl
      };
    }
  } catch (error) {
    console.error('Error enabling Google Drive integration:', error);
    // Remove the enabled flag if there was an error
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_DRIVE_ENABLED);
    throw error;
  }
};

/**
 * Disable Google Drive integration
 */
export const disableGoogleDriveIntegration = async (): Promise<{ result: string }> => {
  try {
    // Remove integration flags from local storage
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_DRIVE_ENABLED);
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_DRIVE_CONFIGURED);
    
    return {
      result: 'success'
    };
  } catch (error) {
    console.error('Error disabling Google Drive integration:', error);
    throw error;
  }
};

/**
 * Check if Google Drive integration is enabled
 */
export const isGoogleDriveEnabled = async (): Promise<boolean> => {
  try {
    const status = await getGoogleDriveIntegrationStatus();
    return status.enabled && status.configured;
  } catch (error) {
    console.error('Error checking Google Drive status:', error);
    return false;
  }
};

/**
 * Mark Google Drive as configured (called after successful authentication)
 */
export const markGoogleDriveAsConfigured = (): void => {
  localStorage.setItem(STORAGE_KEYS.GOOGLE_DRIVE_CONFIGURED, 'true');
}; 