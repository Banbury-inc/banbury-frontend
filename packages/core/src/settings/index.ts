import { deleteAccount } from './deleteAccount';
import { 
  getGoogleDriveIntegrationStatus, 
  enableGoogleDriveIntegration, 
  disableGoogleDriveIntegration,
  isGoogleDriveEnabled
} from './integrations';

export * from './updatePerformanceScoreWeightings';
export * from './deleteAccount';
export * from './integrations';

export const settings = {
  deleteAccount,
  getGoogleDriveIntegrationStatus,
  enableGoogleDriveIntegration,
  disableGoogleDriveIntegration,
  isGoogleDriveEnabled
};