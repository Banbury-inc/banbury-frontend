import React from 'react';
import { Button, Tooltip } from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface ModelSelectorButtonProps {
  currentModel: string;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export function ModelSelectorButton({ currentModel, onClick }: ModelSelectorButtonProps) {
  return (
    <Tooltip title="Select AI Model">
      <Button
        onClick={onClick}
        startIcon={<SmartToyOutlinedIcon fontSize="small" />}
        endIcon={<KeyboardArrowDownIcon fontSize="small" />}
        sx={{ 
          height: '28px',
          padding: '3px 8px',
          minWidth: 'auto',
          fontSize: '13px',
          lineHeight: 1,
          color: 'white',
          textTransform: 'none',
          '& .MuiButton-startIcon': {
            marginRight: '6px',
            marginLeft: '-2px',
          },
          '& .MuiButton-endIcon': {
            marginLeft: '2px',
            marginRight: '-4px',
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }
        }}
      >
        {currentModel}
      </Button>
    </Tooltip>
  );
} 