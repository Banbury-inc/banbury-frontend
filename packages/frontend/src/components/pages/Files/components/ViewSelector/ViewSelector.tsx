import React from 'react';
import { ButtonGroup, Button, Box } from '@mui/material';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';

interface ViewSelectorProps {
  currentView: 'files' | 'sync' | 'shared';
  onViewChange: (view: 'files' | 'sync' | 'shared') => void;
}

const ViewSelector: React.FC<ViewSelectorProps> = ({ currentView, onViewChange }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <ButtonGroup variant="outlined" size="small">
        <Button 
          startIcon={<FolderOutlinedIcon />}
          onClick={() => onViewChange('files')}
          variant={currentView === 'files' ? 'contained' : 'outlined'}
        >
          Files
        </Button>
        <Button 
          startIcon={<CloudOutlinedIcon />}
          onClick={() => onViewChange('sync')}
          variant={currentView === 'sync' ? 'contained' : 'outlined'}
        >
          Sync
        </Button>
        <Button 
          startIcon={<FolderSharedOutlinedIcon />}
          onClick={() => onViewChange('shared')}
          variant={currentView === 'shared' ? 'contained' : 'outlined'}
        >
          Shared
        </Button>
      </ButtonGroup>
    </Box>
  );
};

export default ViewSelector; 