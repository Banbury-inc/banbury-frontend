import React, { useState } from 'react';
import DownloadIcon from '@mui/icons-material/Download';
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
// For the trigger button

interface DownloadProgressProps {
  downloads: {
    filename: string;
    fileType: string;
    progress: number;
    status: 'downloading' | 'completed' | 'failed' | 'skipped';
    totalSize: number;
    downloadedSize: number;
    timeRemaining?: number;
  }[];
}

export default function DownloadProgress({ downloads }: DownloadProgressProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'completed' | 'skipped' | 'failed'>('all');
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (anchorEl) {
      setAnchorEl(null);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'progress-popover' : undefined;

  // Show upload count badge if there are active uploads
  const activeDownloads = downloads.filter(download => download.status === 'downloading').length;

  // Add this filtering logic before the return statement
  const filteredDownloads = downloads.filter(download => {
    if (selectedTab === 'all') return true;
    return download.status === selectedTab;
  });

  return (
    <>
      <Button
        onClick={handleClick}
        aria-label="Download"
        data-testid="download-progress-button"
        sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px', zIndex: 9999 }}
      >
        <DownloadIcon data-testid="DownloadIcon" sx={{ fontSize: 'inherit' }} />
        {activeDownloads > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: -6,
              right: -6,
              bgcolor: 'error.main',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.5rem',
            }}
          >
            {activeDownloads}
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
            <Typography variant="h6" sx={{ color: 'white' }}>Downloads</Typography>
            <IconButton sx={{ color: 'white' }} onClick={handleClose}>
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          {/* Tabs */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {['All downloads', 'Completed', 'Skipped', 'Failed'].map((tab) => (
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
            {filteredDownloads.length === 0 ? (
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', py: 4 }}>
                No downloads in this category
              </Typography>
            ) : (
              filteredDownloads.map((download) => (
                <Box
                  key={download.filename}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1
                  }}
                >
                  {/* Status Icon */}
                  {download.status === 'downloading' ? (
                    <CircularProgress size={24} />
                  ) : (
                    <CheckCircleIcon color="success" />
                  )}

                  {/* File Info */}
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: 'white' }}>{download.filename}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {download.status === 'downloading'
                        ? `Downloading ${(download.downloadedSize / (1024 * 1024)).toFixed(1)}mb / ${(download.totalSize / (1024 * 1024)).toFixed(1)}mb - ${download.timeRemaining}s left...`
                        : `Downloaded to Files`
                      }
                    </Typography>
                    {download.status === 'downloading' && (
                      <LinearProgress
                        variant="determinate"
                        value={download.progress}
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>

                  {/* Action Button */}
                  {download.status === 'downloading' ? (
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
