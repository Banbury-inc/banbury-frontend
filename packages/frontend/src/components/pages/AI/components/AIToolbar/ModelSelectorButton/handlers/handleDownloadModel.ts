import { ipcRenderer } from 'electron';

export const handleDownloadModel = async (modelName: string, loadModels: () => void, onRefreshDeviceInfo: () => void, setDownloadProgress: (updateFunction: (prev: Record<string, string>) => Record<string, string>) => void) => {
    try {
      setDownloadProgress((prev: Record<string, string>) => ({
        ...prev,
        [modelName]: 'Starting download...'
      }));

      const result = await ipcRenderer.invoke('download-ollama-model', modelName);
      
      if (result.success) {
        await loadModels(); // This will now also sync with backend
        
        setDownloadProgress((prev: Record<string, string>) => {
          const newProgress = { ...prev };
          delete newProgress[modelName];
          return newProgress;
        });

        if (onRefreshDeviceInfo) {
          onRefreshDeviceInfo();
        }
      } else {
        setDownloadProgress((prev: Record<string, string>) => {
          const newProgress = { ...prev };
          delete newProgress[modelName];
          return newProgress;
        });
        alert(result.error || 'Failed to download model');
      }
    } catch (error) {
      console.error('Failed to download model:', error);
      setDownloadProgress((prev: Record<string, string>) => {
        const newProgress = { ...prev };
        delete newProgress[modelName];
        return newProgress;
      });
      alert('Failed to download model');
    }
  };