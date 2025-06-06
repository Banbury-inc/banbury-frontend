import React from 'react';
import { Popover, Box, Stack } from '@mui/material';
import { ModelInfo, AVAILABLE_MODELS } from '../constants';
import { ModelSearch } from './ModelSearch';
import { CategoryFilter } from './CategoryFilter';
import { ModelList } from './ModelList';

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
  onModelDelete
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
        },
      }}
    >
      <Box sx={{ p: 2 }}>
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
    </Popover>
  );
} 