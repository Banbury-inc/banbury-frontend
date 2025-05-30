import { ModelInfo } from "../constants";
import { OllamaClient } from "@banbury/core/src/ai";
import { formatBytes } from "@banbury/core/src/utils";

export const handleLoadModels = async (ollamaClient: OllamaClient, setDownloadedModels: (models: ModelInfo[]) => void, deviceInfo: any, syncModelsWithBackend: (localModels: ModelInfo[]) => Promise<void>, setLoading: (loading: boolean) => void) => {
    try {
      setLoading(true);
      
      // Get local models from Ollama
      const ollamaResponse = await ollamaClient.listModels();
      const localModels = ollamaResponse.models.map((model: any) => ({
        name: model.name,
        category: 'Downloaded', // We can categorize downloaded models differently or derive from name
        size: formatBytes(model.size || 0), // Format the size consistently
        isDownloaded: true
      }));
      setDownloadedModels(localModels);
      
      // Only sync with backend if device info is available
      if (deviceInfo) {
        await syncModelsWithBackend(localModels);
      }
      
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };