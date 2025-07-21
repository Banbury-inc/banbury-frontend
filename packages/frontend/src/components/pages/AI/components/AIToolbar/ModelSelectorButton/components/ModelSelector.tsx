import React from 'react';
import { 
  Popover, 
  Box, 
  Stack, 
  Typography, 
  MenuItem, 
  Alert, 
  Button,
  ListItemIcon,
} from '@mui/material';
import {
  Check,
} from '@mui/icons-material';
import { ModelInfo, AVAILABLE_MODELS } from '../constants';
import { ModelSearch } from './ModelSearch';
import { CategoryFilter } from './CategoryFilter';
import { ModelList } from './ModelList';
import { ModelConfig } from '@banbury/core/src/ai/agent/LangGraphAgent';
import { Tabs, Tab } from '../../../../../../common/Tabs/Tabs';

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
  selectedProviderTab: 'local' | 'api';
  onProviderTabChange: (tab: 'local' | 'api') => void;
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
  onAnthropicModelChange,
  onOpenSettings,
  selectedProviderTab,
  onProviderTabChange
}: ModelSelectorProps) {
  const categories = Array.from(new Set(AVAILABLE_MODELS.map(model => model.category)));

  const tabs: Tab[] = [
    { id: 'local', label: 'Local' },
    { id: 'api', label: 'API' }
  ];

  const handleTabChange = (tabId: string) => {
    onProviderTabChange(tabId as 'local' | 'api');
  };

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
            Select AI Model
          </Typography>

          {/* Tabs */}
          <Box sx={{ 
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            mb: 2,
            '& .tab': {
              backgroundColor: 'transparent !important',
              color: 'rgba(255, 255, 255, 0.7) !important',
              border: 'none !important',
              borderRadius: '6px !important',
              padding: '8px 16px !important',
              minWidth: 'auto !important',
              height: 'auto !important',
              margin: '0 4px !important',
              fontSize: '14px !important',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05) !important',
                color: 'rgba(255, 255, 255, 0.9) !important',
              },
              '&.active': {
                backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
                color: '#ffffff !important',
              },
              '& button': {
                display: 'none !important'
              }
            }
          }}>
            <Tabs
              tabs={tabs}
              activeTab={selectedProviderTab}
              onTabChange={handleTabChange}
            />
          </Box>

          {/* Local Models Tab */}
          {selectedProviderTab === 'local' && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="subtitle1" sx={{ color: '#ffffff' }}>
                  Ollama (Local Models)
                </Typography>
              </Box>

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

          {/* API Models Tab */}
          {selectedProviderTab === 'api' && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="subtitle1" sx={{ color: '#ffffff' }}>
                  Anthropic (Cloud API)
                </Typography>
              </Box>

              {!isAnthropicConfigured ? (
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
                  API key required to use Anthropic models
                </Alert>
              ) : (
                <Box>
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          {modelConfig.anthropicModel === model && (
                            <Check fontSize="small" sx={{ color: 'primary.main' }} />
                          )}
                        </ListItemIcon>
                        <Typography variant="body2" color="#ffffff">
                          {model}
                        </Typography>
                      </MenuItem>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </Stack>
      </Box>
    </Popover>
  );
} 
