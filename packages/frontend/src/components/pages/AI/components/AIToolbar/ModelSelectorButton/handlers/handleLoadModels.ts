import { ModelInfo } from "../constants";
import { OllamaClient } from "@banbury/core/src/ai";

export const handleLoadModels = async (ollamaClient: OllamaClient, setDownloadedModels: (models: ModelInfo[]) => void, deviceInfo: any, syncModelsWithBackend: (localModels: ModelInfo[]) => Promise<void>, setLoading: (loading: boolean) => void) => {
    try {
      setLoading(true);
      
      // Get local models from Ollama
      const ollamaResponse = await ollamaClient.listModels();
      const localModels = ollamaResponse.models.map((model: any) => ({ ...model, isDownloaded: true }));
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