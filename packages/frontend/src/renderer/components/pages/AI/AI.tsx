import React, { useEffect, useState, useRef } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { CardContent } from "@mui/material";
import Card from '@mui/material/Card';
import { List, ListItemButton, ListItemText } from '@mui/material';
import { useAlert } from '../../../context/AlertContext';


export default function AI() {
  const { showAlert } = useAlert();
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



  return (
    <Box sx={{ width: '100%', pt: 0 }}>
      <Stack direction="row" spacing={0} sx={{ width: '100%', height: 'calc(100vh - 36px)', overflow: 'hidden' }}>
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
    </Box>
  );
}
