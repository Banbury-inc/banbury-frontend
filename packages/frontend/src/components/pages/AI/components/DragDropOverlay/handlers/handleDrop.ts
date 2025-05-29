import { AlertColor } from '@mui/material';

export const handleDrop = (
  e: React.DragEvent,
  setIsDragging: (isDragging: boolean) => void,
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>,
  showAlert: (title: string, messages: string[], severity: AlertColor) => void
) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);

  const files = Array.from(e.dataTransfer.files);
  files.forEach(file => {
    if (!file.type.startsWith('image/')) {
      showAlert('Error', ['Only image files are allowed'], 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        const base64Data = e.target.result.split(',')[1];
        setSelectedImages(prev => [...prev, base64Data]);
      }
    };
    reader.readAsDataURL(file);
  });
}; 