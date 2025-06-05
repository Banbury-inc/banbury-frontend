import { ModelInfo } from "../constants";
import banbury from '@banbury/core';
import { DeviceInfo } from "@banbury/core/src/types";


// Flag to prevent multiple simultaneous syncs
let isSyncing = false;

export const handleSyncModelsWithBackend = async (localModels: ModelInfo[], deviceInfo: DeviceInfo, onRefreshDeviceInfo: () => void) => {
    try {
      console.log('deviceInfo', deviceInfo);
      // Prevent multiple simultaneous syncs
      if (isSyncing) {
        console.info('DEBUG: Sync already in progress, skipping');
        return;
      }
      
      isSyncing = true;
      console.info('DEBUG: syncModelsWithBackend called');
      
      // If no device info is available, cannot sync
      if (!deviceInfo) {
        console.info('DEBUG: No device info available, skipping sync');
        return;
      }

      const deviceId = deviceInfo._id;
      
      const backendModels = Array.isArray(deviceInfo.downloaded_models) ? deviceInfo.downloaded_models : [];
      const localModelNames = localModels.map((model: ModelInfo) => model.name);
      
      console.info('DEBUG: Local models:', localModelNames);
      console.info('DEBUG: Backend models:', backendModels);
      
      // Find models to add (in local but not in backend)
      const modelsToAdd = localModelNames.filter(modelName => !backendModels.includes(modelName));
      console.info('DEBUG: Models to add to backend:', modelsToAdd);
      
      // Find models to remove (in backend but not in local)
      const modelsToRemove = backendModels.filter((modelName: string) => !localModelNames.includes(modelName));
      console.info('DEBUG: Models to remove from backend:', modelsToRemove);
      
      let hasChanges = false;
      
      // Add models to backend
      for (const modelName of modelsToAdd) {
        try {
          console.info(`DEBUG: Calling addModelToBackend for: ${modelName}`);
          const result = await banbury.ai.addDownloadedModel(modelName, deviceId);
          console.info(`Successfully added model ${modelName} to backend:`, result);
          hasChanges = true;
        } catch (error) {
          console.error(`Failed to add model ${modelName} to backend:`, error);
        }
      }
      
      // Remove models from backend
      for (const modelName of modelsToRemove) {
        try {
          console.info(`DEBUG: Calling removeModelFromBackend for: ${modelName}`);
          const result = await banbury.ai.removeDownloadedModel(modelName, deviceId);
          console.info(`Successfully removed model ${modelName} from backend:`, result);
          hasChanges = true;
        } catch (error) {
          console.error(`Failed to remove model ${modelName} from backend:`, error);
        }
      }
      
      console.info('DEBUG: Model sync completed');

      // Only refresh if there were actual changes
      if (hasChanges) {
        console.info('DEBUG: Changes made, refreshing device info');
        onRefreshDeviceInfo();
      } else {
        console.info('DEBUG: No changes made, skipping refresh');
      }
    } catch (error) {
      console.error('Error syncing models with backend:', error);
    } finally {
      // Always reset the syncing flag
      isSyncing = false;
    }
  };
