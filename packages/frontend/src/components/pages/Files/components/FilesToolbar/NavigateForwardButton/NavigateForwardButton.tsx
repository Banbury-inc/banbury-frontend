import { Button, Tooltip } from '@mui/material';
import React from 'react';
import NavigateNextOutlinedIcon from '@mui/icons-material/NavigateNextOutlined';

export default function NavigateForwardButton({
  backHistory,
  setBackHistory,
  forwardHistory,
  setForwardHistory,
  filePath,
  setFilePath
}: {
  backHistory: string[];
  setBackHistory: (history: string[]) => void;
  forwardHistory: string[];
  setForwardHistory: (history: string[]) => void;
  filePath?: string;
  setFilePath?: (path: string) => void;
}) {
  const handleForwardNavigation = () => {
    if (forwardHistory.length === 0) return;
    
    // Get the first path from forward history
    const nextPath = forwardHistory[0];
    
    // Update the back history with current path before going forward
    if (filePath) {
      setBackHistory([...backHistory, filePath]);
    }
    
    // Update forward history by removing the first item
    setForwardHistory(forwardHistory.slice(1));
    
    // Navigate to the next path
    if (setFilePath) {
      setFilePath(nextPath);
    }
  };

  return (
    <Tooltip title="Navigate forward">
      <Button
        data-testid="navigate-forward-button"
        onClick={handleForwardNavigation}
        disabled={forwardHistory.length === 0}
        sx={{ 
          paddingLeft: '4px', 
          paddingRight: '4px', 
          minWidth: '30px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <NavigateNextOutlinedIcon fontSize="inherit" />
      </Button>
    </Tooltip>
  );
}
