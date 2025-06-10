import React, { useState } from 'react';
import {
  Button, Popover, Box, Typography, Stack,
   Tooltip, Menu,
} from '@mui/material';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import Checkbox from '@mui/material/Checkbox';
import { FormControlLabel } from '@mui/material';


interface ConversationsButtonProps {
  availableTools: {
    id: string;
    label: string;
    isVisible: boolean;
    isEnabled: boolean;
  }[];
  onToggleTool?: (toolId: string, isEnabled: boolean) => void;
}

export default function ToolsButton({ availableTools, onToggleTool }: ConversationsButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const menuOpen = Boolean(menuAnchorEl);


  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };


  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleToggleTool = (toolId: string, isEnabled: boolean) => {
    onToggleTool?.(toolId, isEnabled);
  };


  return (
    <>
      <Tooltip title="Tools">
        <Button
          onClick={handleClick}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          <BuildOutlinedIcon fontSize="inherit" />
        </Button>
      </Tooltip>
      <Popover
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            width: '300px',
            backgroundColor: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            mt: 1,
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
            '& .MuiTypography-root': {
              color: '#ffffff',
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Tools</Typography>
          <Stack spacing={1}>
            {availableTools.map((tool) => (
              <FormControlLabel
                key={tool.id}
                control={
                  <Checkbox
                    checked={tool.isEnabled}
                    onChange={(event) => handleToggleTool(tool.id, event.target.checked)}
                    data-testid={`tool-toggle-${tool.id}`}
                    size="small"
                    sx={{ marginRight: '8px' }}
                  />
                }
                label={
                  <Typography variant="body2" marginLeft="2" >{tool.label}</Typography>
                }
                sx={{
                  margin: 0,
                  '& .MuiFormControlLabel-label': {
                    color: 'white',
                  },
                }}
              />
            ))}
          </Stack>
        </Box>
      </Popover>

      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            paddingTop: 10
          }
        }}
      >
      </Menu>

    </>
  );
}
