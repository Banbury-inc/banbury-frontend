import { ModelInfo } from "../constants";

export const handleDeleteModel = async (modelName: string, loadModels: () => void, onRefreshDeviceInfo: () => void, setDeletingModels: (updateFunction: (prev: Record<string, boolean>) => Record<string, boolean>) => void, currentModel: string, downloadedModels: ModelInfo[], handleModelSelect: (model: string) => void) => {
  const { ipcRenderer } = window.require('electron');

    try {
      setDeletingModels((prev: Record<string, boolean>) => ({
        ...prev,
        [modelName]: true
      }));

      const result = await ipcRenderer.invoke('delete-ollama-model', modelName);
      
      if (result.success) {
        await loadModels();
        onRefreshDeviceInfo();
        
        // If the deleted model was the current model, switch to the first available model
        if (currentModel === modelName) {
          const remainingModels = downloadedModels.filter(model => model.name !== modelName);
          if (remainingModels.length > 0) {
            handleModelSelect(remainingModels[0].name);
          }
        }
        
        // Note: Success notification is shown in the main component's delete handler
      } else {
        const errorMessage = result.error || 'Failed to delete model';
        console.error(errorMessage);
        alert(`Failed to delete model: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
      alert(`Failed to delete model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingModels((prev: Record<string, boolean>) => ({
        ...prev,
        [modelName]: false
      }));
    }
  };