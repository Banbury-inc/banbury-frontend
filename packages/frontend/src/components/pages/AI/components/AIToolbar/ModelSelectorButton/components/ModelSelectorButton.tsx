import React from 'react';
import { Button, Tooltip, Box } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface ModelSelectorButtonProps {
  currentModel: string;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  provider?: 'ollama' | 'anthropic';
  isAnthropicConfigured?: boolean;
}

export function ModelSelectorButton({ 
  currentModel, 
  onClick, 
  provider = 'ollama',
  isAnthropicConfigured = false 
}: ModelSelectorButtonProps) {

  const getTooltipText = () => {
    if (provider === 'anthropic') {
      if (!isAnthropicConfigured) {
        return 'Anthropic API key required - Click to configure';
      }
      return `Anthropic: ${currentModel}`;
    }
    return `Ollama: ${currentModel}`;
  };

  return (
    <Tooltip title={getTooltipText()}>
      <Button
        onClick={onClick}
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
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {currentModel}
        </Box>
      </Button>
    </Tooltip>
  );
} 
