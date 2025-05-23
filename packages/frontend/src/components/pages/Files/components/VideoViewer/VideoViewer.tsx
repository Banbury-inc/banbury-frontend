import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Toolbar,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  GetApp,
  ExpandMore,
  Info
} from '@mui/icons-material';
import { shell } from 'electron';
import fs from 'fs';
import { pathToFileURL } from 'url';
import ReactPlayer from 'react-player';

interface VideoViewerProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
}

const VideoViewer: React.FC<VideoViewerProps> = ({
  src,
  fileName,
  onError,
  onLoad
}) => {
  const [error, setError] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<{
    fileExists: boolean;
    fileSize: number;
    filePath: string;
    canPlay: boolean;
    errorDetails?: any;
  }>({
    fileExists: false,
    fileSize: 0,
    filePath: '',
    canPlay: false
  });

  const playerRef = useRef<ReactPlayer>(null);

  // Get file info
  React.useEffect(() => {
    let filePath = src;
    
    // Remove file:// protocol if present
    if (filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }

    try {
      const fileExists = fs.existsSync(filePath);
      let fileSize = 0;
      
      if (fileExists) {
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }

      // Convert to file URL for react-player
      const fileUrl = pathToFileURL(filePath).href;
      
      setDebugInfo({
        fileExists,
        fileSize,
        filePath: fileUrl,
        canPlay: ReactPlayer.canPlay(fileUrl)
      });

    } catch (error) {
      console.error('Error getting file info:', error);
      setDebugInfo(prev => ({
        ...prev,
        errorDetails: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
      setError(true);
      onError?.();
    }
  }, [src, onError]);

  const handleReady = () => {
    setReady(true);
    onLoad?.();
  };

  const handleError = (error: any) => {
    console.error('Video player error:', error);
    setError(true);
    setDebugInfo(prev => ({
      ...prev,
      errorDetails: {
        ...prev.errorDetails,
        playerError: error
      }
    }));
    onError?.();
  };

  const handleOpenWithSystemApp = () => {
    let filePath = src;
    if (filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }
    shell.openPath(filePath);
  };

  if (error || !debugInfo.fileExists) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          height: '100%',
          overflow: 'auto'
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Failed to load video
          </Typography>
          <Typography variant="body2">
            {fileName ? `Could not play "${fileName}"` : 'The video file could not be played'}
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {!debugInfo.fileExists 
            ? 'The video file does not exist or cannot be accessed.'
            : 'This might be due to an unsupported format or codec.'
          }
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            onClick={handleOpenWithSystemApp}
            startIcon={<GetApp />}
          >
            Open with System App
          </Button>
          <Button 
            variant="text" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </Box>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info />
              <Typography>Debug Information</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                File Information:
              </Typography>
              <Typography variant="body2">
                File path: {src}
              </Typography>
              <Typography variant="body2">
                File exists: {debugInfo.fileExists ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2">
                File size: {(debugInfo.fileSize / (1024 * 1024)).toFixed(2)} MB
              </Typography>
              <Typography variant="body2">
                React Player can play: {debugInfo.canPlay ? 'Yes' : 'No'}
              </Typography>
              
              {debugInfo.errorDetails && (
                <>
                  <Typography variant="body2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                    Error Details:
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(debugInfo.errorDetails, null, 2)}
                  </Typography>
                </>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Video Toolbar */}
      <Toolbar 
        variant="dense" 
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 48,
          gap: 1
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {fileName}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Size: {(debugInfo.fileSize / (1024 * 1024)).toFixed(2)} MB
        </Typography>
        
        <IconButton onClick={handleOpenWithSystemApp} size="small" title="Open with system app">
          <GetApp />
        </IconButton>
      </Toolbar>

      {/* Video Player */}
      <Box 
        sx={{ 
          flexGrow: 1,
          position: 'relative',
          backgroundColor: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pb: 2
        }}
      >
        <ReactPlayer
          ref={playerRef}
          url={debugInfo.filePath}
          width="100%"
          height="100%"
          controls={true}
          onReady={handleReady}
          onError={handleError}
          config={{
            file: {
              attributes: {
                crossOrigin: 'anonymous',
                preload: 'metadata'
              }
            }
          }}
          // Better performance settings
          playsinline={true}
          pip={false}
          stopOnUnmount={true}
          style={{
            backgroundColor: 'black'
          }}
        />
      </Box>
    </Box>
  );
};

export default VideoViewer; 
