import { ModelInfo } from "../constants";
import { handleAddModelToBackend } from "./handleAddModelFromBackend";
import { handleRemoveModelFromBackend } from "./handleRemoveModelFromBackend";
import os from "os";

export const handleSyncModelsWithBackend = async (localModels: ModelInfo[], deviceExistsInBackend: boolean, deviceInfo: any, setDeviceExistsInBackend: (exists: boolean) => void) => {
    try {
      console.info('DEBUG: syncModelsWithBackend called');
      
      // If no device info is available, cannot sync
      if (!deviceInfo) {
        console.info('DEBUG: No device info available, skipping sync');
        return;
      }
      
      const deviceName = os.hostname();
      console.info(`DEBUG: Device name: ${deviceName}`);
      console.info('DEBUG: Device exists in backend:', deviceExistsInBackend);
      
      if (!deviceExistsInBackend) {
        console.info('DEBUG: Device does not exist in backend, creating');
        try {
          // Try to create/register the device first
          // This could be an API call to register the device if needed
          setDeviceExistsInBackend(true);
        } catch (error) {
          console.error('DEBUG: Failed to register device:', error);
          return;
        }
      }
      
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
      
      // Add models to backend
      for (const modelName of modelsToAdd) {
        try {
          console.info(`DEBUG: Calling addModelToBackend for: ${modelName}`);
          const result = await handleAddModelToBackend(deviceName, modelName);
          console.info(`Successfully added model ${modelName} to backend:`, result);
        } catch (error) {
          console.error(`Failed to add model ${modelName} to backend:`, error);
        }
      }
      
      // Remove models from backend
      for (const modelName of modelsToRemove) {
        try {
          console.info(`DEBUG: Calling removeModelFromBackend for: ${modelName}`);
          const result = await handleRemoveModelFromBackend(deviceName, modelName);
          console.info(`Successfully removed model ${modelName} from backend:`, result);
        } catch (error) {
          console.error(`Failed to remove model ${modelName} from backend:`, error);
        }
      }
      
      console.info('DEBUG: Model sync completed');
    } catch (error) {
      console.error('Error syncing models with backend:', error);
    }
  };