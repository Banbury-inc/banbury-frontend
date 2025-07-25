import React, { useState, useRef, useEffect } from 'react';
import { Typography, TextField, Box, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { ToolbarButton } from '../../../common/ToolbarButton/ToolbarButton';

interface RenameableTitleProps {
  title: string;
  onRename: (newTitle: string) => void;
  variant?: 'h5' | 'h6' | 'inherit';
  isDocument?: boolean;
}

export default function RenameableTitle({ 
  title, 
  onRename, 
  variant = 'inherit',
  isDocument = false 
}: RenameableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [isHovered, setIsHovered] = useState(false);
  const textFieldRef = useRef<HTMLDivElement>(null);

  // Update editValue when title changes
  useEffect(() => {
    setEditValue(title);
  }, [title]);

  // Focus the text field when editing starts
  useEffect(() => {
    if (isEditing && textFieldRef.current) {
      const inputElement = textFieldRef.current.querySelector('input');
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }
  }, [isEditing]);

  const startEditing = () => {
    setIsEditing(true);
    setEditValue(title);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditValue(title);
  };

  const confirmRename = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== title) {
      // For documents, ensure the extension is preserved
      let newTitle = trimmedValue;
      if (isDocument) {
        const originalExtension = title.split('.').pop();
        const newExtension = trimmedValue.split('.').pop();
        
        // If user didn't include extension or changed it, preserve original
        if (!newExtension || newExtension === trimmedValue || newExtension !== originalExtension) {
          const baseName = trimmedValue.replace(/\.[^/.]+$/, ''); // Remove any extension
          newTitle = `${baseName}.${originalExtension}`;
        }
      }
      
      onRename(newTitle);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      confirmRename();
    } else if (event.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleBlur = () => {
    confirmRename();
  };

  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
        <TextField
          ref={textFieldRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          variant="outlined"
          size="small"
                      sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                fontSize: variant === 'h5' ? '1.5rem' : variant === 'h6' ? '1.25rem' : 'inherit',
                fontWeight: variant === 'inherit' ? 'normal' : 600,
              }
            }}
        />
        <ToolbarButton
          onClick={confirmRename}
          sx={{ 
            paddingLeft: '4px', 
            paddingRight: '4px', 
            minWidth: '30px',
            color: 'success.main'
          }}
        >
          <CheckIcon fontSize="inherit" />
        </ToolbarButton>
        <ToolbarButton
          onClick={cancelEditing}
          sx={{ 
            paddingLeft: '4px', 
            paddingRight: '4px', 
            minWidth: '30px',
            color: 'error.main'
          }}
        >
          <CloseIcon fontSize="inherit" />
        </ToolbarButton>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
        borderRadius: 1,
        p: 0.5,
        ml: -0.5, // Offset padding to align with original position
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={startEditing}
    >
      <Typography 
        variant={variant} 
        sx={{ 
          fontWeight: variant === 'inherit' ? 'normal' : 600, 
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {title}
      </Typography>
      <Tooltip title="Rename">
        <ToolbarButton
          sx={{
            paddingLeft: '4px', 
            paddingRight: '4px', 
            minWidth: '30px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s',
            color: 'text.secondary'
          }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            startEditing();
          }}
        >
          <EditIcon fontSize="inherit" />
        </ToolbarButton>
      </Tooltip>
    </Box>
  );
} 