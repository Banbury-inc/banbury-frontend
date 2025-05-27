import React from 'react';
import { Box, Typography } from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';

interface GoogleDriveTreeNodeProps {
  setFilePath: (path: string) => void;
  setFilePathDevice: (device: string) => void;
}

const GoogleDriveTreeNode: React.FC<GoogleDriveTreeNodeProps> = ({
  setFilePath,
  setFilePathDevice
}) => {
  const handleClick = () => {
    setFilePath('Core/GoogleDrive');
    setFilePathDevice('GoogleDrive');
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '4px',
        '&:hover': {
          backgroundColor: 'action.hover'
        }
      }}
      onClick={handleClick}
    >
      <CloudIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
      <Typography variant="body2">Google Drive</Typography>
    </Box>
  );
};

export default GoogleDriveTreeNode; 