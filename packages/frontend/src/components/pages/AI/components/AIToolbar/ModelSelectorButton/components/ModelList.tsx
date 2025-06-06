import React from 'react';
import { List, ListItem, ListItemText, Typography, Divider } from '@mui/material';
import { ModelInfo, AVAILABLE_MODELS } from '../constants';
import { ModelItem } from './ModelItem';

interface ModelListProps {
  downloadedModels: ModelInfo[];
  searchQuery: string;
  selectedCategory: string;
  currentModel: string;
  downloadProgress: { [key: string]: string };
  deletingModels: { [key: string]: boolean };
  loading: boolean;
  onModelSelect: (modelName: string) => void;
  onModelDownload: (modelName: string) => void;
  onModelDelete: (modelName: string) => void;
}

export function ModelList({
  downloadedModels,
  searchQuery,
  selectedCategory,
  currentModel,
  downloadProgress,
  deletingModels,
  loading,
  onModelSelect,
  onModelDownload,
  onModelDelete
}: ModelListProps) {
  if (loading) {
    return (
      <ListItem>
        <ListItemText 
          primary={
            <Typography variant="body2" sx={{ color: 'grey.500' }}>
              Loading models...
            </Typography>
          }
        />
      </ListItem>
    );
  }

  const filteredModels = AVAILABLE_MODELS.filter(model => 
    (!selectedCategory || model.category === selectedCategory) &&
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = selectedCategory ? [selectedCategory] : Array.from(new Set(AVAILABLE_MODELS.map(model => model.category)));

  return (
    <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
      {downloadedModels.length > 0 && (
        <>
          <Typography variant="caption" sx={{ color: 'grey.500', px: 2, display: 'block', mt: 1 }}>
            Downloaded Models
          </Typography>
          {downloadedModels
            .filter(model => model.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(model => (
              <ModelItem
                key={`downloaded-${model.name}`}
                model={model}
                isDownloaded={true}
                isCurrentModel={currentModel === model.name}
                isDownloading={!!downloadProgress[model.name]}
                isDeleting={!!deletingModels[model.name]}
                downloadProgress={downloadProgress[model.name]}
                onSelect={onModelSelect}
                onDownload={onModelDownload}
                onDelete={onModelDelete}
              />
            ))
          }
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.kj)', my: 1 }} />
        </>
      )}
      
      {categories.map(category => (
        <React.Fragment key={category}>
          <Typography variant="caption" sx={{ color: 'grey.500', px: 2, display: 'block', mt: 1 }}>
            {category}
          </Typography>
          {filteredModels
            .filter(model => 
              model.category === category && 
              !downloadedModels.some(dm => dm.name === model.name)
            )
            .map(model => (
              <ModelItem
                key={`available-${model.name}`}
                model={model}
                isDownloaded={false}
                isCurrentModel={false}
                isDownloading={!!downloadProgress[model.name]}
                isDeleting={false}
                downloadProgress={downloadProgress[model.name]}
                onSelect={onModelSelect}
                onDownload={onModelDownload}
                onDelete={onModelDelete}
              />
            ))
          }
        </React.Fragment>
      ))}
    </List>
  );
} 