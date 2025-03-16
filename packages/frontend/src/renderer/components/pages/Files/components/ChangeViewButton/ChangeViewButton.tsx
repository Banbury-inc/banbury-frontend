import React, { useState } from 'react';
import { Button, Tooltip, Menu as StyledMenu, MenuItem, Typography } from "@mui/material";
import { Box } from "@mui/material";
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';

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

export default function ChangeViewButton({ currentView, onViewChange }: ChangeViewButtonProps) {
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null);

  const viewOptions: ViewOption[] = [
    { value: 'list', label: 'List', icon: <ViewListIcon fontSize="small" /> },
    { value: 'grid', label: 'Grid', icon: <GridViewIcon fontSize="small" /> },
    { value: 'large_grid', label: 'Large Grid', icon: <GridViewIcon fontSize="small" /> }
  ];

  const handleViewMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (viewMenuAnchor) {
      setViewMenuAnchor(null);
    } else {
      setViewMenuAnchor(event.currentTarget);
    }
  };

  const handleViewMenuClose = () => {
    setViewMenuAnchor(null);
  };

  const handleViewChange = (newView: ViewType) => {
    onViewChange(newView);
    handleViewMenuClose();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: 2 }}>
      <Tooltip title="Change view">
        <Button
          data-testid="change-view-button"
          onClick={handleViewMenuOpen}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          {currentView.includes('grid') ? 
            <GridViewIcon fontSize="inherit" /> : 
            <ViewListIcon fontSize="inherit" />
          }
        </Button>
      </Tooltip>
      <StyledMenu
        data-testid="change-view-menu"
        anchorEl={viewMenuAnchor}
        open={Boolean(viewMenuAnchor)}
        onClose={handleViewMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {viewOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleViewChange(option.value)}
            selected={currentView === option.value}
            data-testid={`view-option-${option.value}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.primary',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)'
                }
              }
            }}
          >
            {option.icon}
            <Typography variant="body2">{option.label}</Typography>
          </MenuItem>
        ))}
      </StyledMenu>
    </Box>
  );
}
