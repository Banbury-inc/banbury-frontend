import React, { useState, useEffect } from 'react';
import { OllamaClient } from '@banbury/core/src/ai';
import { ipcRenderer } from 'electron';
import { ModelInfo } from './constants';
import { ModelSelectorButton as Button } from './components/ModelSelectorButton';
import { ModelSelector } from './components/ModelSelector';
import { handleLoadModels } from './handlers/handleLoadModels';
import { handleDownloadModel } from './handlers/handleDownloadModel';
import { handleDeleteModel } from './handlers/handleDeleteModel';
import { handleSyncModelsWithBackend } from './handlers/handleSyncModelsWithBackend';

interface DeviceInfo {
  downloaded_models?: string[];
  [key: string]: any;
}

interface ModelSelectorButtonProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  deviceInfo?: DeviceInfo | null;
  onRefreshDeviceInfo?: () => void;
}

export default function ModelSelectorButton({ 
  currentModel, 
  onModelChange, 
  deviceInfo, 
  onRefreshDeviceInfo 
}: ModelSelectorButtonProps) {
  // UI State
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Model State
  const [downloadedModels, setDownloadedModels] = useState<ModelInfo[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: string }>({});
  const [deletingModels, setDeletingModels] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [deviceExistsInBackend, setDeviceExistsInBackend] = useState<boolean | null>(null);

  const open = Boolean(anchorEl);
  const ollamaClient = new OllamaClient('http://localhost:11434');

  // Handler functions
  const loadModels = () => handleLoadModels(
    ollamaClient, 
    setDownloadedModels, 
    deviceInfo, 
    syncModelsWithBackend, 
    setLoading
  );

  const syncModelsWithBackend = (localModels: ModelInfo[]) => handleSyncModelsWithBackend(
    localModels, 
    deviceExistsInBackend || false, 
    deviceInfo, 
    setDeviceExistsInBackend
  );

  const handleModelSelect = (model: string) => {
    onModelChange(model);
    handleClose();
  };

  const handleDownloadModelWrapper = (modelName: string) => handleDownloadModel(
    modelName, 
    loadModels, 
    onRefreshDeviceInfo || (() => {}), 
    setDownloadProgress
  );

  const handleDeleteModelWrapper = (modelName: string) => handleDeleteModel(
    modelName, 
    loadModels, 
    onRefreshDeviceInfo || (() => {}), 
    setDeletingModels, 
    currentModel, 
    downloadedModels, 
    handleModelSelect
  );

  // Event handlers
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchQuery('');
    setSelectedCategory('');
  };

  // Effects
  useEffect(() => {
    if (open) {
      loadModels();
    }
  }, [open]);

  useEffect(() => {
    // Sync models when deviceInfo becomes available
    if (deviceInfo && downloadedModels.length > 0) {
      syncModelsWithBackend(downloadedModels);
    }
  }, [deviceInfo]);

  useEffect(() => {
    // Listen for model download progress updates
    const handleModelProgress = (_event: any, data: { modelName: string, progress: string }) => {
      setDownloadProgress((prev) => ({
        ...prev,
        [data.modelName]: data.progress
      }));
    };

    ipcRenderer.on('ollama-model-progress', handleModelProgress);

    return () => {
      ipcRenderer.removeListener('ollama-model-progress', handleModelProgress);
    };
  }, []);

  return (
    <>
      <Button 
        currentModel={currentModel}
        onClick={handleClick}
      />

      <ModelSelector
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        downloadedModels={downloadedModels}
        currentModel={currentModel}
        downloadProgress={downloadProgress}
        deletingModels={deletingModels}
        loading={loading}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategory}
        onModelSelect={handleModelSelect}
        onModelDownload={handleDownloadModelWrapper}
        onModelDelete={handleDeleteModelWrapper}
      />
    </>
  );
} 
