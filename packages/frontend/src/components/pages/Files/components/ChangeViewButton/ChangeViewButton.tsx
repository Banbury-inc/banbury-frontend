import React, { useState } from 'react';
import { Button, Tooltip, Typography, Popover, Box, Stack } from "@mui/material";
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { styled } from '@mui/material/styles';

export type ViewType = 'list' | 'grid' | 'large_grid' | 'large_list';

interface ViewOption {
  value: ViewType;
  label: string;
  icon: React.ReactNode;
}

interface ChangeViewButtonProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewButton = styled(Button)(() => ({
  width: '100%',
  justifyContent: 'flex-start',
  padding: '12px 16px',
  borderRadius: '8px',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
}));

export default function ChangeViewButton({ currentView, onViewChange }: ChangeViewButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const viewOptions: ViewOption[] = [
    { value: 'list', label: 'List', icon: <ViewListIcon fontSize="small" /> },
    { value: 'grid', label: 'Grid', icon: <GridViewIcon fontSize="small" /> },
    { value: 'large_grid', label: 'Large Grid', icon: <GridViewIcon fontSize="small" /> },
  ];

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewChange = (newView: ViewType) => {
    onViewChange(newView);
    handleClose();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: 2 }}>
      <Tooltip title="Change view">
        <Button
          data-testid="change-view-button"
          onClick={handleClick}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          {currentView.includes('grid') ? 
            <GridViewIcon fontSize="inherit" /> : 
            <ViewListIcon fontSize="inherit" />
          }
        </Button>
      </Tooltip>
      <Popover
        data-testid="change-view-popover"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            width: '200px',
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
          <Stack spacing={1}>
            {viewOptions.map((option) => (
              <ViewButton
                key={option.value}
                onClick={() => handleViewChange(option.value)}
                sx={{
                  backgroundColor: currentView === option.value ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  '&:hover': {
                    backgroundColor: currentView === option.value ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                  }
                }}
                data-testid={`view-option-${option.value}`}
              >
                {option.icon}
                <Typography sx={{ ml: 1 }}>{option.label}</Typography>
              </ViewButton>
            ))}
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}
