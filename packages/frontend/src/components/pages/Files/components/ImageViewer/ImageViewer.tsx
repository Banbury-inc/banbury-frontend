import React from 'react';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { shell } from 'electron';
import fs from 'fs';
import path from 'path';

interface ImageViewerProps {
  src: string;
  alt: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ 
  src, 
  alt, 
  fileName,
  onError, 
  onLoad 
}) => {
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState<string>('');

  React.useEffect(() => {
    const loadImage = async () => {
      try {
        let filePath = src;
        
        // Remove file:// protocol if present
        if (filePath.startsWith('file://')) {
          filePath = filePath.replace('file://', '');
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error('File does not exist');
        }

        // Read the file and convert to base64 data URL
        const imageBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        
        // Determine MIME type based on extension
        let mimeType = 'image/jpeg'; // default
        switch (ext) {
          case '.png':
            mimeType = 'image/png';
            break;
          case '.gif':
            mimeType = 'image/gif';
            break;
          case '.bmp':
            mimeType = 'image/bmp';
            break;
          case '.svg':
            mimeType = 'image/svg+xml';
            break;
          case '.webp':
            mimeType = 'image/webp';
            break;
          case '.jpg':
          case '.jpeg':
          default:
            mimeType = 'image/jpeg';
            break;
        }

        const base64 = imageBuffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;
        setImageSrc(dataUrl);
        
      } catch (error) {
        console.error('Error loading image:', error);
        setImageError(true);
        setImageLoading(false);
        onError?.();
      }
    };

    loadImage();
  }, [src, onError]);

  const handleImageLoad = () => {
    setImageLoading(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    onError?.();
  };

  const handleOpenWithSystemApp = () => {
    let filePath = src;
    if (filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }
    shell.openPath(filePath);
  };

  if (imageError) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          textAlign: 'center'
        }}
      >
        <Typography variant="h6" color="error" gutterBottom>
          Failed to load image
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fileName ? `Could not display "${fileName}"` : 'The image could not be displayed'}
        </Typography>
        <Button 
          variant="outlined" 
          onClick={handleOpenWithSystemApp}
          sx={{ mt: 1 }}
        >
          Open with System App
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '100%',
        height: '100%'
      }}
    >
      {imageLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1
          }}
        >
          <CircularProgress />
        </Box>
      )}
      
      {imageSrc && (
        <Zoom
          a11yNameButtonZoom="Expand image"
          a11yNameButtonUnzoom="Minimize image"
          zoomMargin={20}
        >
          <img
            src={imageSrc}
            alt={alt}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              cursor: 'zoom-in',
              transition: 'opacity 0.3s ease',
              opacity: imageLoading ? 0 : 1
            }}
          />
        </Zoom>
      )}
      
      {fileName && !imageLoading && (
        <Typography 
          variant="caption" 
          sx={{ 
            mt: 1, 
            textAlign: 'center',
            color: 'text.secondary'
          }}
        >
          {fileName}
        </Typography>
      )}
    </Box>
  );
};

export default ImageViewer; 