import React from 'react';
import { Box, Typography } from '@mui/material';

interface DragDropOverlayProps {
  isDragging: boolean;
}

export default function DragDropOverlay({ isDragging }: DragDropOverlayProps) {
  if (!isDragging) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Box
        sx={{
          padding: 4,
          borderRadius: 2,
          border: '2px dashed',
          borderColor: 'primary.main',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <Typography variant="h6" sx={{ color: 'primary.main', textAlign: 'center', mb: 1 }}>
          Drop images here
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          Release to upload images
        </Typography>
      </Box>
    </Box>
  );
} 