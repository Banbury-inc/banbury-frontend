import React, { useEffect, useState, useRef } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { CardContent } from "@mui/material";
import Card from '@mui/material/Card';
import { List, ListItemButton, ListItemText } from '@mui/material';
import { useAlert } from '../../../context/AlertContext';
import { styled } from '@mui/material/styles';


export default function AI() {
  const { showAlert } = useAlert();
  const [activeSection, setActiveSection] = useState('public-profile');
  const [settingsListWidth, setSettingsListWidth] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartX.current;
        const newWidth = Math.max(100, Math.min(600, dragStartWidth.current + deltaX));
        setSettingsListWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = settingsListWidth;
  };

  const handleSectionClick = (sectionId: string) => {
    try {
      setActiveSection(sectionId);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        // showAlert('Warning', [`Section "${sectionId}" not found`], 'warning');
      }
    } catch (error) {
      console.error('Error navigating to section:', error);
      showAlert('Error', ['Failed to navigate to section', error instanceof Error ? error.message : 'Unknown error'], 'error');
    }
  };

  return (
    <Box sx={{ width: '100%', pt: 0 }}>
      <Stack direction="row" spacing={0} sx={{ width: '100%', height: 'calc(100vh - 76px)', overflow: 'hidden' }}>
        <Stack
          sx={{
            position: 'relative',
            width: `${settingsListWidth}px`,
            flexShrink: 0,
            transition: isDragging ? 'none' : 'width 0.3s ease',
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <Card variant="outlined" sx={{
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            borderLeft: 0,
            borderRight: 0,
            borderRadius: 0,
          }}>
          </Card>
        </Stack>

        <Card variant="outlined" sx={{
          flexGrow: 1,
          height: '100%',
          overflow: 'auto',
          borderLeft: 0,
          borderRadius: 0,
        }}>
          <CardContent>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
