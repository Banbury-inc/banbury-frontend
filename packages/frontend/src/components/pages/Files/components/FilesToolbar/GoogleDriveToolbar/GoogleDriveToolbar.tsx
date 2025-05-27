import React, { useState } from 'react';
import {
  Button,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Box,
  Typography
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon,
  AccountCircle as AccountCircleIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Link as LinkIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { uploadToGoogleDrive, createGoogleDriveFile } from '@banbury/core/src/files/googleDrive';
import { useAlert } from '../../../../../../renderer/context/AlertContext';

interface GoogleDriveToolbarProps {
  authRequired: boolean;
  onRefresh: () => void;
  isLoading: boolean;
  filePath: string;
}

const GoogleDriveToolbar: React.FC<GoogleDriveToolbarProps> = ({
  authRequired,
  onRefresh,
  isLoading,
  filePath
}) => {
  const [uploadMenuAnchor, setUploadMenuAnchor] = useState<null | HTMLElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { showAlert } = useAlert();

  const handleUploadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUploadMenuAnchor(event.currentTarget);
  };

  const handleUploadMenuClose = () => {
    setUploadMenuAnchor(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    handleUploadMenuClose();

    try {
      const file = files[0];
      
      // Extract folder ID if we're in a subfolder
      // For now, we'll upload to root. In a full implementation, 
      // you'd extract the folder ID from the current path
      const parentFolderId = undefined; // TODO: Implement folder ID extraction

      const result = await uploadToGoogleDrive(file, parentFolderId);
      
      showAlert(
        'Upload Successful',
        [`Successfully uploaded "${file.name}" to Google Drive.`],
        'success'
      );
      
      // Refresh the file list
      onRefresh();
      
    } catch (error: any) {
      console.error('Error uploading to Google Drive:', error);
      showAlert(
        'Upload Failed',
        [
          `Failed to upload file to Google Drive.`,
          error.message || 'Unknown error occurred.'
        ],
        'error'
      );
    } finally {
      setIsUploading(false);
    }

    // Reset the input
    event.target.value = '';
  };

  const handleCreateFolder = async () => {
    handleUploadMenuClose();
    
    // For now, we'll create a simple text file as a placeholder
    // In a full implementation, you'd want a proper folder creation dialog
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    setIsUploading(true);

    try {
      // Google Drive folders are created differently than files
      // This is a simplified implementation
      await createGoogleDriveFile(
        `${folderName}/.placeholder`,
        'This is a placeholder file for the folder.',
        'text/plain'
      );
      
      showAlert(
        'Folder Created',
        [`Successfully created folder "${folderName}" in Google Drive.`],
        'success'
      );
      
      onRefresh();
      
    } catch (error: any) {
      console.error('Error creating folder:', error);
      showAlert(
        'Folder Creation Failed',
        [
          `Failed to create folder in Google Drive.`,
          error.message || 'Unknown error occurred.'
        ],
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleReauthenticate = () => {
    // Open Google authentication in a new window
    const authUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/authentication/google/`;
    window.open(authUrl, '_blank', 'width=500,height=600');
    
    showAlert(
      'Authentication Window Opened',
      [
        'Please complete the Google authentication in the new window.',
        'After authentication, refresh this page to access your Google Drive files.'
      ],
      'info'
    );
  };

  if (authRequired) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="warning" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleReauthenticate}
              startIcon={<LinkIcon />}
            >
              Connect Google Drive
            </Button>
          }
          icon={<WarningIcon />}
        >
          <Typography variant="body2">
            Google Drive authentication required. Please connect your Google account to access Drive files.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Tooltip title="Upload to Google Drive">
        <Button
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          onClick={handleUploadMenuOpen}
          disabled={isUploading || isLoading}
          size="small"
        >
          Upload
        </Button>
      </Tooltip>

      <Menu
        anchorEl={uploadMenuAnchor}
        open={Boolean(uploadMenuAnchor)}
        onClose={handleUploadMenuClose}
      >
        <MenuItem component="label">
          <input
            type="file"
            hidden
            onChange={handleFileUpload}
            multiple={false}
          />
          <ListItemIcon>
            <CloudUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Upload File</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleCreateFolder}>
          <ListItemIcon>
            <CreateNewFolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Create Folder</ListItemText>
        </MenuItem>
      </Menu>

      <Tooltip title="Refresh Google Drive files">
        <IconButton
          onClick={onRefresh}
          disabled={isLoading}
          size="small"
        >
          <RefreshIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Re-authenticate with Google">
        <IconButton
          onClick={handleReauthenticate}
          size="small"
        >
          <AccountCircleIcon />
        </IconButton>
      </Tooltip>

      {(isUploading || isLoading) && (
        <Typography variant="caption" color="text.secondary">
          {isUploading ? 'Uploading...' : 'Loading...'}
        </Typography>
      )}
    </Box>
  );
};

export default GoogleDriveToolbar; 