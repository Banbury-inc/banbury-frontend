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
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { useAuth } from '../../../renderer/context/AuthContext';
import { banbury } from '@banbury/core';
import { DownloadInfo } from '@banbury/core/src/device/add_downloads_info';

interface DownloadProgressProps {
  downloads: DownloadInfo[];
}

export default function DownloadProgress({ downloads }: DownloadProgressProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'completed' | 'skipped' | 'failed'>('all');
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const { username, websocket } = useAuth();

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

  const handleCancelClick = async (downloadToCancel: DownloadInfo) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      console.error('Cannot cancel download: WebSocket is not open.');
      return;
    }
    if (!username) {
        console.error('Cannot cancel download: Username not found.');
        return;
    }

    await banbury.files.cancel_download_request(websocket, username, downloadToCancel as any);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'progress-popover' : undefined;

  const activeDownloads = downloads.filter(download => download.status === 'downloading').length;

  const filteredDownloads = downloads.filter(download => {
    if (selectedTab === 'all') {
      return true;
    }
    if (selectedTab === 'failed' && download.status === 'canceled') {
      return true;
    }
    return download.status === selectedTab;
  });

  // Count the number of downloads in each category for the tab labels
  const downloadCounts = {
    all: downloads.length,
    completed: downloads.filter(d => d.status === 'completed').length,
    skipped: downloads.filter(d => d.status === 'skipped').length,
    failed: downloads.filter(d => d.status === 'failed').length,
  };

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

          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            {['All downloads', 'Completed', 'Skipped', 'Failed'].map((tab) => {
              // Convert tab label to match our state values
              const tabValue = tab === 'All downloads' ? 'all' : tab.toLowerCase();
              
              // Display all tabs regardless of download counts
              return (
                <Button
                  key={tab}
                  variant={selectedTab === tabValue ? 'contained' : 'text'}
                  sx={{
                    bgcolor: selectedTab === tabValue ? 'white' : 'rgba(255,255,255,0.1)',
                    fontSize: '12px',
                    color: selectedTab === tabValue ? 'black' : 'white',
                    borderRadius: '20px',
                    '&:hover': {
                      bgcolor: selectedTab === tabValue ? 'white' : 'rgba(255,255,255,0.2)',
                    },
                    mb: 1 // Add margin bottom for flex wrap
                  }}
                  onClick={() => setSelectedTab(tabValue as any)}
                >
                  {tab} {tabValue !== 'all' && downloadCounts[tabValue as keyof typeof downloadCounts] > 0 && 
                    `(${downloadCounts[tabValue as keyof typeof downloadCounts]})`
                  }
                </Button>
              );
            })}
          </Stack>

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
                  {download.status === 'downloading' ? (
                    <CircularProgress size={24} />
                  ) : download.status === 'completed' ? (
                    <CheckCircleIcon color="success" />
                  ) : download.status === 'failed' ? (
                    <ErrorIcon color="error" />
                  ) : download.status === 'skipped' ? (
                    <WarningIcon sx={{ color: 'warning.main' }} />
                  ) : null}

                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: 'white' }}>{download.filename}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {download.status === 'downloading'
                        ? `Downloading ${(download.downloadedSize / (1024 * 1024)).toFixed(1)}mb / ${(download.totalSize / (1024 * 1024)).toFixed(1)}mb - ${download.timeRemaining}s left...`
                        : download.status === 'completed' ? `Downloaded to Files`
                        : download.status === 'failed' ? 'Download failed'
                        : download.status === 'skipped' ? 'Download skipped'
                        : 'Status unknown'
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

                  {download.status === 'downloading' ? (
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        fontSize: '12px',
                      }}
                      onClick={() => handleCancelClick(download)}
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
