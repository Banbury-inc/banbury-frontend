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
import { DeviceInfo } from '@banbury/core/src/types';
import { ModelConfig } from '@banbury/core/src/ai/agent/LangGraphAgent';

interface ModelSelectorButtonProps {
  modelConfig: ModelConfig;
  onModelConfigChange: (config: Partial<ModelConfig>) => void;
  deviceInfo: DeviceInfo | undefined;
  onRefreshDeviceInfo?: () => void;
  onOpenSettings?: () => void;
}

export default function ModelSelectorButton({ 
  modelConfig,
  onModelConfigChange,
  deviceInfo, 
  onRefreshDeviceInfo,
  onOpenSettings
}: ModelSelectorButtonProps) {
  // UI State
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProviderTab, setSelectedProviderTab] = useState<'local' | 'api'>(
    modelConfig.provider === 'anthropic' ? 'api' : 'local'
  );
  
  // Model State
  const [downloadedModels, setDownloadedModels] = useState<ModelInfo[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: string }>({});
  const [deletingModels, setDeletingModels] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [isAnthropicConfigured, setIsAnthropicConfigured] = useState(false);

  const open = Boolean(anchorEl);
  const ollamaClient = new OllamaClient('http://localhost:11434');

  // Check Anthropic configuration
  useEffect(() => {
    const checkAnthropicConfig = () => {
      const apiKey = localStorage.getItem('ANTHROPIC_API_KEY');
      setIsAnthropicConfigured(!!apiKey);
    };
    
    checkAnthropicConfig();
    
    // Listen for storage changes
    const handleStorageChange = () => checkAnthropicConfig();
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync tab with current provider
  useEffect(() => {
    setSelectedProviderTab(modelConfig.provider === 'anthropic' ? 'api' : 'local');
  }, [modelConfig.provider]);

  // Handler functions
  const loadModels = () => handleLoadModels(
    ollamaClient, 
    setDownloadedModels, 
    deviceInfo, 
    syncModelsWithBackend, 
    setLoading
  );

  const syncModelsWithBackend = (localModels: ModelInfo[]) => handleSyncModelsWithBackend(localModels, deviceInfo, onRefreshDeviceInfo || (() => {}));

  const handleOllamaModelSelect = (model: string) => {
    onModelConfigChange({ 
      provider: 'ollama',
      ollamaModel: model 
    });
    handleClose();
  };

  const handleProviderChange = (provider: 'ollama' | 'anthropic') => {
    if (provider === 'anthropic' && !isAnthropicConfigured) {
      // Don't switch if Anthropic is not configured, but show settings
      onOpenSettings?.();
      return;
    }
    
    onModelConfigChange({ provider });
    handleClose();
  };

  const handleAnthropicModelChange = (model: string) => {
    onModelConfigChange({ 
      provider: 'anthropic', 
      anthropicModel: model 
    });
    handleClose();
  };

  const handleProviderTabChange = (tab: 'local' | 'api') => {
    setSelectedProviderTab(tab);
    // Auto-switch provider when tab changes
    if (tab === 'local' && modelConfig.provider !== 'ollama') {
      onModelConfigChange({ provider: 'ollama' });
    } else if (tab === 'api' && modelConfig.provider !== 'anthropic' && isAnthropicConfigured) {
      onModelConfigChange({ provider: 'anthropic' });
    }
  };

  const handleDownloadModelWrapper = (modelName: string) => handleDownloadModel(
    modelName, 
    loadModels, 
    setDownloadProgress,
  );

  const handleDeleteModelWrapper = (modelName: string) => handleDeleteModel(
    modelName, 
    loadModels, 
    onRefreshDeviceInfo || (() => {}), 
    setDeletingModels, 
    modelConfig.ollamaModel || 'qwen3:latest', 
    downloadedModels, 
    handleOllamaModelSelect
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
    if (open && selectedProviderTab === 'local') {
      loadModels();
    }
  }, [open, selectedProviderTab]);

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

  // Get current display text for the button
  const getCurrentDisplayText = () => {
    if (modelConfig.provider === 'anthropic') {
      return `${modelConfig.anthropicModel || 'claude-3-5-sonnet-20241022'}`;
    }
    return modelConfig.ollamaModel || 'qwen3:latest';
  };

  return (
    <>
      <Button 
        currentModel={getCurrentDisplayText()}
        onClick={handleClick}
        provider={modelConfig.provider}
        isAnthropicConfigured={isAnthropicConfigured}
      />

      <ModelSelector
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        downloadedModels={downloadedModels}
        currentModel={modelConfig.ollamaModel || 'qwen3:latest'}
        downloadProgress={downloadProgress}
        deletingModels={deletingModels}
        loading={loading}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategory}
        onModelSelect={handleOllamaModelSelect}
        onModelDownload={handleDownloadModelWrapper}
        onModelDelete={handleDeleteModelWrapper}
        // Provider-related props
        modelConfig={modelConfig}
        isAnthropicConfigured={isAnthropicConfigured}
        onProviderChange={handleProviderChange}
        onAnthropicModelChange={handleAnthropicModelChange}
        onOpenSettings={onOpenSettings}
        // New tab-related props
        selectedProviderTab={selectedProviderTab}
        onProviderTabChange={handleProviderTabChange}
      />
    </>
  );
} 
