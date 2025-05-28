import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { FolderIcon, DocumentIcon } from '@heroicons/react/20/solid';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import CodeIcon from '@mui/icons-material/Code';
import { isImageFile, isVideoFile, isPdfFile, isWordFile, isExcelFile, isCsvFile, isCodeFile } from '../../utils/fileUtils';

interface FileThumbnailProps {
  fileName: string;
  fileKind: 'Folder' | 'File';
  thumbnailLink?: string;
  filePath?: string;
  size?: 'small' | 'medium' | 'large';
  isGoogleDrive?: boolean;
  fileId?: string; // Google Drive file ID for thumbnail proxy
}

const FileThumbnail: React.FC<FileThumbnailProps> = ({
  fileName,
  fileKind,
  thumbnailLink,
  filePath,
  size = 'medium',
  isGoogleDrive = false,
  fileId
}) => {
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [localImageSrc, setLocalImageSrc] = useState<string>('');
  const [shouldLoadThumbnail, setShouldLoadThumbnail] = useState(false);

  const sizeMap = {
    small: { width: 40, height: 40, iconSize: 20 },
    medium: { width: 60, height: 60, iconSize: 24 },
    large: { width: 80, height: 80, iconSize: 32 }
  };

  const { width, height, iconSize } = sizeMap[size];

  // For now, disable direct thumbnail loading from Google Drive to avoid rate limits
  // We'll show file type icons instead
  useEffect(() => {
    if (isGoogleDrive && thumbnailLink && fileKind === 'File') {
      // Don't load thumbnails directly to avoid rate limiting
      setShouldLoadThumbnail(false);
    }
  }, [isGoogleDrive, thumbnailLink, fileKind]);

  // Load local image file for preview
  useEffect(() => {
    if (!isGoogleDrive && filePath && isImageFile(fileName) && fileKind === 'File') {
      setThumbnailLoading(true);
      
      const loadLocalImage = async () => {
        try {
          const fs = await import('fs');
          const path = await import('path');
          
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
          setLocalImageSrc(dataUrl);
          setThumbnailLoading(false);
        } catch (error) {
          console.error('Error loading local image:', error);
          setThumbnailError(true);
          setThumbnailLoading(false);
        }
      };

      loadLocalImage();
    }
  }, [filePath, fileName, fileKind, isGoogleDrive]);

  const handleThumbnailLoad = () => {
    setThumbnailLoading(false);
  };

  const handleThumbnailError = (event: any) => {
    console.error('Thumbnail load error:', {
      fileName,
      thumbnailLink,
      error: event.target?.error || 'Unknown error'
    });
    setThumbnailLoading(false);
    setThumbnailError(true);
  };

  // Get appropriate icon for file type with enhanced styling
  const getFileIcon = () => {
    const iconStyle = { width: iconSize, height: iconSize };
    
    if (isImageFile(fileName)) {
      return <ImageIcon style={{ ...iconStyle, color: '#4caf50' }} />;
    }
    if (isVideoFile(fileName)) {
      return <VideoLibraryIcon style={{ ...iconStyle, color: '#f44336' }} />;
    }
    if (isPdfFile(fileName)) {
      return <PictureAsPdfIcon style={{ ...iconStyle, color: '#d32f2f' }} />;
    }
    if (isWordFile(fileName)) {
      return <DescriptionIcon style={{ ...iconStyle, color: '#1976d2' }} />;
    }
    if (isExcelFile(fileName) || isCsvFile(fileName)) {
      return <TableChartIcon style={{ ...iconStyle, color: '#388e3c' }} />;
    }
    if (isCodeFile(fileName)) {
      return <CodeIcon style={{ ...iconStyle, color: '#ff9800' }} />;
    }
    return <DocumentIcon style={{ ...iconStyle, color: '#666' }} />;
  };

  // For folders, always show folder icon
  if (fileKind === 'Folder') {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px'
        }}
      >
        <FolderIcon style={{ width: iconSize, height: iconSize, color: '#1976d2' }} />
      </Box>
    );
  }

  // For Google Drive files with thumbnail links (Google Drive provides thumbnails for many file types)
  if (isGoogleDrive && thumbnailLink && shouldLoadThumbnail) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {!thumbnailError ? (
          <img
            src={thumbnailLink}
            alt={fileName}
            onLoad={handleThumbnailLoad}
            onError={handleThumbnailError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'background.default'
            }}
          >
            {getFileIcon()}
          </Box>
        )}
      </Box>
    );
  }

  // For Google Drive files without thumbnails or before loading
  if (isGoogleDrive && !shouldLoadThumbnail) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          '&:hover': {
            bgcolor: 'action.hover'
          }
        }}
      >
        {getFileIcon()}
      </Box>
    );
  }

  // For local image files
  if (!isGoogleDrive && localImageSrc && isImageFile(fileName)) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {thumbnailLoading && (
          <CircularProgress size={iconSize} />
        )}
        {!thumbnailError && localImageSrc && (
          <img
            src={localImageSrc}
            alt={fileName}
            onLoad={handleThumbnailLoad}
            onError={handleThumbnailError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: thumbnailLoading ? 'none' : 'block'
            }}
          />
        )}
        {(thumbnailError || (!localImageSrc && !thumbnailLoading)) && (
          <ImageIcon style={{ width: iconSize, height: iconSize, color: '#666' }} />
        )}
      </Box>
    );
  }

  // For other file types, show appropriate icons

  return (
    <Box
      sx={{
        width,
        height,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        '&:hover': {
          bgcolor: 'action.hover'
        }
      }}
    >
      {getFileIcon()}
    </Box>
  );
};

export default FileThumbnail; 