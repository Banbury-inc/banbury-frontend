import React from 'react';
import { 
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Stack,
  Box
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { ModelInfo } from '../constants';
import { ModelProgress } from './ModelProgress';
import { ToolbarButton } from '../../../../../../common/ToolbarButton/ToolbarButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface ModelItemProps {
  model: ModelInfo;
  isDownloaded: boolean;
  isCurrentModel: boolean;
  isDownloading: boolean;
  isDeleting: boolean;
  downloadProgress?: string;
  onSelect: (modelName: string) => void;
  onDownload: (modelName: string) => void;
  onDelete: (modelName: string) => void;
}

export function ModelItem({
  model,
  isDownloaded,
  isCurrentModel,
  isDownloading,
  isDeleting,
  downloadProgress,
  onSelect,
  onDownload,
  onDelete
}: ModelItemProps) {
  const handleClick = () => {
    if (!isDeleting && !isDownloading) {
      isDownloaded ? onSelect(model.name) : onDownload(model.name);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(model.name);
  };

  return (
    <ListItem
      onClick={handleClick}
      sx={{
        borderRadius: 1,
        height: 36,
        mb: 0.5,
        cursor: isDeleting || isDownloading ? 'default' : 'pointer',
        backgroundColor: isCurrentModel 
          ? 'rgba(255, 255, 255, 0.08)'
          : 'transparent',
        '&:hover': {
          backgroundColor: isDeleting || isDownloading ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
        },
        opacity: isDeleting ? 0.5 : 1,
        alignItems: 'center',
        px: 1,
        py: 0,
      }}
    >
      <ListItemIcon sx={{ minWidth: 28 }}>
        {isCurrentModel ? (
          <CheckIcon fontSize="small" sx={{ color: 'primary.main' }} />
        ) : isDownloaded ? null : (
          <CloudDownloadIcon fontSize="small" sx={{ color: 'grey.500' }} />
        )}
      </ListItemIcon>
      <ListItemText
        primary={
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ height: 36 }}>
            <Typography variant="body2" sx={{ 
              color: 'white', 
              fontWeight: 500, 
              fontSize: '0.875rem',
              pl: !isDownloaded ? 1 : 1  // Add padding for non-downloaded models with cloud icons
            }}>
              {model.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ color: 'grey.500', fontSize: '0.75rem' }}>
                {model.size}
              </Typography>
              {isDownloaded && !isCurrentModel && (
                <ToolbarButton
                  onClick={handleDelete}
                  disabled={isDeleting || isDownloading}
                  sx={{
                    minWidth: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: '1rem' }} />
                </ToolbarButton>
              )}
            </Stack>
          </Stack>
        }
        secondary={
          (isDownloading || isDeleting) ? (
            <Box sx={{ height: 16, mt: -1 }}>
              <ModelProgress 
                isDownloading={isDownloading}
                isDeleting={isDeleting}
                progress={downloadProgress}
              />
            </Box>
          ) : null
        }
        sx={{ margin: 0 }}
      />
    </ListItem>
  );
} 
