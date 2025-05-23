import React, { useState } from 'react';
import { Button, Tooltip, Typography, Popover, Box, Stack, Checkbox, FormControlLabel } from "@mui/material";
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
}

interface ToggleColumnsButtonProps {
  columnOptions: ColumnOption[];
  onColumnVisibilityChange: (columnId: string, isVisible: boolean) => void;
}


export default function ToggleColumnsButton({ columnOptions, onColumnVisibilityChange }: ToggleColumnsButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleToggleColumn = (columnId: string, isVisible: boolean) => {
    onColumnVisibilityChange(columnId, isVisible);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Tooltip title="Toggle columns">
        <Button
          data-testid="toggle-columns-button"
          onClick={handleClick}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          <ViewColumnIcon fontSize="inherit" />
        </Button>
      </Tooltip>
      <Popover
        data-testid="toggle-columns-menu"
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
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Toggle Columns</Typography>
          <Stack spacing={1}>
            {columnOptions.map((option) => (
              <FormControlLabel
                key={option.id}
                control={
                  <Checkbox
                    checked={option.visible}
                    onChange={(event) => handleToggleColumn(option.id, event.target.checked)}
                    data-testid={`column-toggle-${option.id}`}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">{option.label}</Typography>
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
    </Box>
  );
} 
