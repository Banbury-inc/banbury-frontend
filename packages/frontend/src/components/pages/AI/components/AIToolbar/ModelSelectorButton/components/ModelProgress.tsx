import React from 'react';
import { LinearProgress, Typography } from '@mui/material';

interface ModelProgressProps {
  isDownloading: boolean;
  isDeleting: boolean;
  progress?: string;
}

export function ModelProgress({ isDownloading, isDeleting, progress }: ModelProgressProps) {
  if (!isDownloading && !isDeleting) {
    return null;
  }

  return (
    <>
      <LinearProgress sx={{ mt: 0.5 }} />
      <Typography variant="caption" sx={{ color: 'grey.500', mt: 0.5, display: 'block' }}>
        {isDeleting ? 'Deleting model...' : progress}
      </Typography>
    </>
  );
} 