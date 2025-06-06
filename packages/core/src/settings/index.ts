import { deleteAccount } from './deleteAccount';
import { 
  getGoogleDriveIntegrationStatus, 
  enableGoogleDriveIntegration, 
  disableGoogleDriveIntegration,
  isGoogleDriveEnabled
} from './integrations';
import { getSettings } from './getSettings';

export * from './updatePerformanceScoreWeightings';
export * from './deleteAccount';
export * from './integrations';
export * from './getSettings';

export const settings = {
  deleteAccount,
  getGoogleDriveIntegrationStatus,
  enableGoogleDriveIntegration,
  disableGoogleDriveIntegration,
  isGoogleDriveEnabled,
  getSettings
};