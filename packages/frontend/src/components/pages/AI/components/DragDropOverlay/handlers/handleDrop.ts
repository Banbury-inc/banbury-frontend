import { AlertColor } from '@mui/material';

export const handleDrop = (
  e: React.DragEvent,
  setIsDragging: (isDragging: boolean) => void,
  showAlert: (title: string, messages: string[], severity: AlertColor) => void
) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);

  const files = Array.from(e.dataTransfer.files);
  
  // Validate that all files are images
  const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
  if (invalidFiles.length > 0) {
    showAlert('Error', ['Only image files are allowed'], 'error');
    return;
  }

  // If validation passes, dispatch a custom event that MessageBox can listen to
  if (files.length > 0) {
    const dropEvent = new CustomEvent('filesDrop', { 
      detail: { files } 
    });
    window.dispatchEvent(dropEvent);
  }
}; 