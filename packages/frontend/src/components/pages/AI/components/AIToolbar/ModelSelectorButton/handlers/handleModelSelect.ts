import { ipcRenderer } from "electron";

export const handleModelSelect = async (modelName: string, onModelChange: (model: string) => void, handleClose: () => void) => {
    onModelChange(modelName);
    // Save the selected model
    try {
      await ipcRenderer.invoke('set-selected-model', modelName);
    } catch (error) {
      console.error('Failed to save model selection:', error);
    }
    handleClose();
  };