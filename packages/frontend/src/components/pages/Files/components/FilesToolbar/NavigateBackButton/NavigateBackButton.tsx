import React from 'react';
import { Button, Tooltip } from '@mui/material';
import NavigateBeforeOutlinedIcon from '@mui/icons-material/NavigateBeforeOutlined';

export default function NavigateBackButton({
  backHistory,
  setBackHistory,
  filePath,
  setFilePath,
  setForwardHistory
}: {
  backHistory: string[];
  setBackHistory: (history: string[]) => void;
  filePath?: string;
  setFilePath?: (path: string) => void;
  setForwardHistory?: (history: string[]) => void;
}) {
  const handleBackNavigation = () => {
    if (backHistory.length === 0) return;
    
    // Get the last path from history
    const previousPath = backHistory[backHistory.length - 1];
    
    // Update the forward history with current path before going back
    if (setForwardHistory && filePath) {
      // Create new forward history with current path at the beginning
      const newForwardHistory = filePath ? [filePath] : [];
      setForwardHistory(newForwardHistory);
    }
    
    // Update back history by removing the last item
    setBackHistory(backHistory.slice(0, -1));
    
    // Navigate to the previous path
    if (setFilePath) {
      setFilePath(previousPath);
    }
  };

  return (
    <Tooltip title="Navigate back">
      <Button
        data-testid="navigate-back-button"
        onClick={handleBackNavigation}
        disabled={backHistory.length === 0}
        sx={{ 
          paddingLeft: '4px', 
          paddingRight: '4px', 
          minWidth: '30px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <NavigateBeforeOutlinedIcon fontSize="inherit" />
      </Button>
    </Tooltip>
  );
}
