import { ModelInfo } from "../constants";
import banbury from '@banbury/core';
import { DeviceInfo } from "@banbury/core/src/types";


// Flag to prevent multiple simultaneous syncs
let isSyncing = false;

export const handleSyncModelsWithBackend = async (localModels: ModelInfo[], deviceInfo: DeviceInfo | undefined, onRefreshDeviceInfo: () => void) => {
    try {
      // Prevent multiple simultaneous syncs
      if (isSyncing) {
        return;
      }
      
      isSyncing = true;
      
      // If no device info is available, cannot sync
      if (!deviceInfo) {
        return;
      }

      const deviceId = deviceInfo._id;
      
      const backendModels = Array.isArray(deviceInfo.downloaded_models) ? deviceInfo.downloaded_models : [];
      const localModelNames = localModels.map((model: ModelInfo) => model.name);
      
      // Find models to add (in local but not in backend)
      const modelsToAdd = localModelNames.filter(modelName => !backendModels.includes(modelName));
      
      // Find models to remove (in backend but not in local)
      const modelsToRemove = backendModels.filter((modelName: string) => !localModelNames.includes(modelName));
      
      let hasChanges = false;
      
      // Add models to backend
      for (const modelName of modelsToAdd) {
        try {
          await banbury.ai.addDownloadedModel(modelName, deviceId);
          hasChanges = true;
        } catch (error) {
          console.error(`Failed to add model ${modelName} to backend:`, error);
        }
      }
      
      // Remove models from backend
      for (const modelName of modelsToRemove) {
        try {
          await banbury.ai.removeDownloadedModel(modelName, deviceId);
          hasChanges = true;
        } catch (error) {
          console.error(`Failed to remove model ${modelName} from backend:`, error);
        }
      }

      // Only refresh if there were actual changes
      if (hasChanges) {
        onRefreshDeviceInfo();
      }
    } catch (error) {
      console.error('Error syncing models with backend:', error);
    } finally {
      // Always reset the syncing flag
      isSyncing = false;
    }
  };
