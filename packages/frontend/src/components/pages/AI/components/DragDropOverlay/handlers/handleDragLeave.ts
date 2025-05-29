export const handleDragLeave = (
  e: React.DragEvent,
  setIsDragging: (isDragging: boolean) => void
) => {
  e.preventDefault();
  e.stopPropagation();
  // Only set dragging to false if we're leaving the main container
  if (e.currentTarget === e.target) {
    setIsDragging(false);
  }
}; 