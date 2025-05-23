import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { shell } from 'electron';
import ImageViewer from '../ImageViewer/ImageViewer';
import { isImageFile } from '../../utils/fileUtils';

interface FileViewerModalProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  filePath: string;
  fileType: string;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({
  open,
  onClose,
  fileName,
  filePath,
  fileType
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const handleOpenWithSystemApp = () => {
    shell.openPath(filePath);
    onClose(); // Close the modal after opening with system app
  };
  
  const renderFileContent = () => {
    if (isImageFile(fileName)) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: isMobile ? '60vh' : '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ImageViewer
            src={`file://${filePath}`}
            alt={fileName}
            fileName={fileName}
            onError={() => {
              // Handle error case
              console.error('Failed to load image:', filePath);
            }}
          />
        </Box>
      );
    }

    // For non-image files, show a placeholder for now
    return (
      <Box sx={{ 
        p: 4, 
        textAlign: 'center',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="h6" gutterBottom>
          File Type Not Supported
        </Typography>
        <Typography variant="body2" color="text.secondary">
          In-app viewing for {fileType} files is not yet supported.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          The file will open with your system's default application instead.
        </Typography>
        <Button 
          variant="outlined" 
          onClick={handleOpenWithSystemApp}
          sx={{ mt: 3 }}
          startIcon={<OpenInNewIcon />}
        >
          Open with System App
        </Button>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: 'background.paper',
          minHeight: isMobile ? '100vh' : '80vh',
          maxHeight: isMobile ? '100vh' : '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Typography variant="h6" component="div" sx={{ 
          flexGrow: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          mr: 2
        }}>
          {fileName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            color="inherit"
            onClick={handleOpenWithSystemApp}
            aria-label="open with system app"
            title="Open with system app"
          >
            <OpenInNewIcon />
          </IconButton>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ 
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {renderFileContent()}
      </DialogContent>

      {!isMobile && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={handleOpenWithSystemApp} 
            variant="outlined"
            startIcon={<OpenInNewIcon />}
          >
            Open with System App
          </Button>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default FileViewerModal; 