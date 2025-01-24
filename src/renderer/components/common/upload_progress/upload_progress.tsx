import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Stack,
  LinearProgress,
  CircularProgress,
  Popover,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UploadIcon from '@mui/icons-material/Upload'; // For the trigger button

interface UploadProgressProps {
  uploads: {
    filename: string;
    fileType: string;
    progress: number;
    status: 'uploading' | 'completed' | 'failed' | 'skipped';
    totalSize: number;
    uploadedSize: number;
    timeRemaining?: number;
  }[];
}

export default function UploadProgress({ uploads }: UploadProgressProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'completed' | 'skipped' | 'failed'>('all');
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'progress-popover' : undefined;

  // Show upload count badge if there are active uploads
  const activeUploads = uploads.filter(upload => upload.status === 'uploading').length;

  return (
    <>
      <Button
        onClick={handleClick}
        sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px', zIndex: 9999 }}
      >
        <UploadIcon sx={{ fontSize: 'inherit' }} />
        {activeUploads > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: -6,
              right: -6,
              bgcolor: 'error.main',
              borderRadius: '50%',
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.5rem',
            }}
          >
            {activeUploads}
          </Box>
        )}
      </Button>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
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
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}>
            <Typography variant="h6" sx={{ color: 'white' }}>Uploads</Typography>
            <IconButton sx={{ color: 'white' }} onClick={handleClose}>
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          {/* Tabs */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {['All uploads', 'Completed', 'Skipped', 'Failed'].map((tab) => (
              <Button
                key={tab}
                variant={selectedTab === tab.toLowerCase() ? 'contained' : 'text'}
                sx={{
                  bgcolor: selectedTab === tab.toLowerCase() ? 'white' : 'rgba(255,255,255,0.1)',
                  fontSize: '12px',
                  color: selectedTab === tab.toLowerCase() ? 'black' : 'white',
                  borderRadius: '20px',
                  '&:hover': {
                    bgcolor: selectedTab === tab.toLowerCase() ? 'white' : 'rgba(255,255,255,0.2)',
                  }
                }}
                onClick={() => setSelectedTab(tab.toLowerCase() as any)}
              >
                {tab}
              </Button>
            ))}
          </Stack>

          {/* Upload List */}
          <Stack spacing={2}>
            {uploads.length === 0 ? (
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', py: 4 }}>
                No uploads in progress
              </Typography>
            ) : (
              uploads.map((upload) => (
                <Box
                  key={upload.filename}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1
                  }}
                >
                  {/* Status Icon */}
                  {upload.status === 'uploading' ? (
                    <CircularProgress size={24} />
                  ) : (
                    <CheckCircleIcon color="success" />
                  )}

                  {/* File Info */}
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: 'white' }}>{upload.filename}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {upload.status === 'uploading' 
                        ? `Uploading ${Math.round(upload.uploadedSize / (1024 * 1024))}MB / ${Math.round(upload.totalSize / (1024 * 1024))}MB - ${upload.timeRemaining}s left...`
                        : `Uploaded to Files`
                      }
                    </Typography>
                    {upload.status === 'uploading' && (
                      <LinearProgress 
                        variant="determinate" 
                        value={upload.progress} 
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>

                  {/* Action Button */}
                  {upload.status === 'uploading' ? (
                    <Button 
                      variant="contained"
                      size="small"
                      sx={{
                        fontSize: '12px',
                      }}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        fontSize: '12px',
                      }}
                    >
                      Copy link
                    </Button>
                  )}
                </Box>
              ))
            )}
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
