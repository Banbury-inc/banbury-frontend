import React from 'react';
import { AlertColor } from '@mui/material';

export const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>, showAlert: (title: string, messages: string[], severity: AlertColor) => void) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        showAlert('Error', ['Only image files are allowed'], 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          // Extract the base64 data from the data URL
          const base64Data = e.target.result.split(',')[1];
          setSelectedImages(prev => [...prev, base64Data]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Clear the input
    event.target.value = '';
  };