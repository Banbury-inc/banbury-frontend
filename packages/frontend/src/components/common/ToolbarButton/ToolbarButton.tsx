import React from 'react';
import { Button } from '@mui/material';

export function ToolbarButton({ children, onClick, className = '', ...props }: React.ComponentPropsWithoutRef<typeof Button>) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={className}
      sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px', ...props.sx }}
      {...props}
    >
      {children}
    </Button>
  );
}