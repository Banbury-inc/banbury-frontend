import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Skeleton,
  Grid,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { ViewType as FileViewType } from '../FilesToolbar/ChangeViewButton/ChangeViewButton';

interface GoogleDriveLoadingIndicatorProps {
  isLoading: boolean;
  error?: string | null;
  hasFiles: boolean;
  viewType: FileViewType;
  itemCount?: number;
}

const GoogleDriveLoadingIndicator: React.FC<GoogleDriveLoadingIndicatorProps> = ({
  isLoading,
  error,
  hasFiles,
  viewType,
  itemCount = 8
}) => {
  // If there's an error, show error state
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert 
          severity="error" 
          icon={<ErrorOutlineIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // If not loading and has no files, don't render anything
  if (!isLoading && !hasFiles) {
    return null;
  }

  // Initial loading state (no files loaded yet)
  if (isLoading && !hasFiles) {
    return (
      <Box sx={{ p: 3 }}>
        {/* Header loading indicator */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          mb: 3,
          flexDirection: 'column',
          gap: 2
        }}>
          <CloudIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.7 }} />
          <Typography variant="h6" color="textSecondary">
            Loading Google Drive files...
          </Typography>
          <LinearProgress 
            sx={{ width: '300px', borderRadius: 1 }} 
            color="primary"
          />
        </Box>

        {/* Skeleton loaders based on view type */}
        {viewType.includes('grid') ? (
          <Grid container spacing={2}>
            {Array.from({ length: itemCount }).map((_, index) => (
              <Grid item xs={viewType === 'grid' ? 1.5 : 3} key={index}>
                <Card sx={{ height: '100%', borderRadius: '12px' }}>
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                    <Skeleton 
                      variant="rectangular" 
                      width={viewType === 'grid' ? 60 : 80} 
                      height={viewType === 'grid' ? 60 : 80}
                      sx={{ borderRadius: 1 }}
                    />
                  </Box>
                  <CardContent sx={{ pt: 0.5 }}>
                    <Skeleton variant="text" width="80%" height={20} />
                    <Skeleton variant="text" width="60%" height={16} />
                    <Skeleton variant="text" width="50%" height={14} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          // List view skeletons
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Array.from({ length: Math.min(itemCount, 10) }).map((_, index) => (
              <Box key={index} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1
              }}>
                <Skeleton variant="rectangular" width={32} height={32} sx={{ mr: 2 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="text" width="20%" height={16} />
                </Box>
                <Skeleton variant="text" width="80px" height={16} />
                <Skeleton variant="text" width="100px" height={16} sx={{ ml: 2 }} />
                <Skeleton variant="text" width="80px" height={16} sx={{ ml: 2 }} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  // Progressive loading state (files are being added)
  if (isLoading && hasFiles) {
    return (
      <Box sx={{ 
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1000,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        minWidth: 200,
        boxShadow: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} thickness={5} />
          <Typography variant="body2" color="textSecondary">
            Loading more files...
          </Typography>
        </Box>
      </Box>
    );
  }

  return null;
};

export default GoogleDriveLoadingIndicator; 