import React from 'react';
import { 
  Popover, 
  Box, 
  Stack, 
  Typography, 
  MenuItem, 
  Divider, 
  Alert, 
  Button,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import {
  SmartToy,
  Cloud,
  Settings,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { ModelInfo, AVAILABLE_MODELS } from '../constants';
import { ModelSearch } from './ModelSearch';
import { CategoryFilter } from './CategoryFilter';
import { ModelList } from './ModelList';
import { ModelConfig } from '@banbury/core/src/ai/agent/LangGraphAgent';

const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-sonnet-4-20250514',
];

interface ModelSelectorProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  searchQuery: string;
  selectedCategory: string;
  downloadedModels: ModelInfo[];
  currentModel: string;
  downloadProgress: { [key: string]: string };
  deletingModels: { [key: string]: boolean };
  loading: boolean;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onModelSelect: (modelName: string) => void;
  onModelDownload: (modelName: string) => void;
  onModelDelete: (modelName: string) => void;
  modelConfig: ModelConfig;
  isAnthropicConfigured: boolean;
  onProviderChange: (provider: 'ollama' | 'anthropic') => void;
  onAnthropicModelChange: (model: string) => void;
  onOpenSettings?: () => void;
}

export function ModelSelector({
  anchorEl,
  open,
  onClose,
  searchQuery,
  selectedCategory,
  downloadedModels,
  currentModel,
  downloadProgress,
  deletingModels,
  loading,
  onSearchChange,
  onCategoryChange,
  onModelSelect,
  onModelDownload,
  onModelDelete,
  modelConfig,
  isAnthropicConfigured,
  onProviderChange,
  onAnthropicModelChange,
  onOpenSettings
}: ModelSelectorProps) {
  const categories = Array.from(new Set(AVAILABLE_MODELS.map(model => model.category)));

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: {
          backgroundColor: '#000000',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          mt: 1,
          boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
          '& .MuiTypography-root': {
            color: '#ffffff',
          },
          minWidth: 320,
          maxWidth: 400,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
            Select AI Provider & Model
          </Typography>

          <Box>
            <MenuItem
              onClick={() => onProviderChange('ollama')}
              selected={modelConfig.provider === 'ollama'}
              sx={{
                borderRadius: 1,
                mb: 1,
                backgroundColor: modelConfig.provider === 'ollama' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              <ListItemIcon>
                <SmartToy sx={{ color: '#ffffff' }} />
              </ListItemIcon>
              <ListItemText>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography color="#ffffff">Ollama (Local)</Typography>
                  <Chip label="Free" size="small" color="success" />
                </Box>
                <Typography variant="caption" color="#cccccc">
                  Run models locally on your machine
                </Typography>
              </ListItemText>
              <CheckCircle sx={{ color: '#4caf50' }} fontSize="small" />
            </MenuItem>

            {modelConfig.provider === 'ollama' && (
              <Box sx={{ ml: 2, mb: 2 }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <ModelSearch 
                      searchQuery={searchQuery}
                      onSearchChange={onSearchChange}
                    />

                    {categories.length > 0 && (
                      <CategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onCategoryChange={onCategoryChange}
                      />
                    )}
                  </Stack>

                  <ModelList
                    downloadedModels={downloadedModels}
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    currentModel={currentModel}
                    downloadProgress={downloadProgress}
                    deletingModels={deletingModels}
                    loading={loading}
                    onModelSelect={onModelSelect}
                    onModelDownload={onModelDownload}
                    onModelDelete={onModelDelete}
                  />
                </Stack>
              </Box>
            )}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          <Box>
            <MenuItem
              onClick={() => onProviderChange('anthropic')}
              selected={modelConfig.provider === 'anthropic'}
              disabled={!isAnthropicConfigured}
              sx={{
                borderRadius: 1,
                backgroundColor: modelConfig.provider === 'anthropic' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                },
                opacity: isAnthropicConfigured ? 1 : 0.6,
              }}
            >
              <ListItemIcon>
                <Cloud sx={{ color: '#ffffff' }} />
              </ListItemIcon>
              <ListItemText>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography color="#ffffff">Anthropic (Cloud)</Typography>
                  <Chip label="Paid" size="small" color="warning" />
                </Box>
                <Typography variant="caption" color="#cccccc">
                  High-performance cloud models
                </Typography>
              </ListItemText>
              {isAnthropicConfigured ? (
                <CheckCircle sx={{ color: '#4caf50' }} fontSize="small" />
              ) : (
                <Warning sx={{ color: '#ff9800' }} fontSize="small" />
              )}
            </MenuItem>

            {!isAnthropicConfigured && (
              <Box sx={{ ml: 2, mb: 1 }}>
                <Alert 
                  severity="warning" 
                  sx={{ 
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    border: '1px solid rgba(255, 152, 0, 0.2)',
                    '& .MuiAlert-message': { color: '#ffffff' }
                  }}
                  action={
                    <Button size="small" onClick={onOpenSettings} sx={{ color: '#ff9800' }}>
                      Configure
                    </Button>
                  }
                >
                  API key required
                </Alert>
              </Box>
            )}

            {modelConfig.provider === 'anthropic' && isAnthropicConfigured && (
              <Box sx={{ ml: 2, mt: 1 }}>
                <Typography variant="caption" sx={{ color: '#cccccc', mb: 1, display: 'block' }}>
                  Available Models:
                </Typography>
                <Stack spacing={0.5}>
                  {ANTHROPIC_MODELS.map((model) => (
                    <MenuItem
                      key={model}
                      onClick={() => onAnthropicModelChange(model)}
                      selected={modelConfig.anthropicModel === model}
                      sx={{
                        borderRadius: 1,
                        fontSize: '0.875rem',
                        backgroundColor: modelConfig.anthropicModel === model ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        },
                      }}
                    >
                      <Typography variant="body2" color="#ffffff">
                        {model}
                      </Typography>
                    </MenuItem>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          <MenuItem onClick={onOpenSettings} sx={{ borderRadius: 1 }}>
            <ListItemIcon>
              <Settings sx={{ color: '#ffffff' }} />
            </ListItemIcon>
            <ListItemText>
              <Typography color="#ffffff">Model Settings</Typography>
              <Typography variant="caption" color="#cccccc">
                Configure API keys and preferences
              </Typography>
            </ListItemText>
          </MenuItem>
        </Stack>
      </Box>
    </Popover>
  );
} 