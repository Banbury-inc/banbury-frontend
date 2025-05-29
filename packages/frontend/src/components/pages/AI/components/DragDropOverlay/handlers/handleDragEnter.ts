export const handleDragEnter = (
  e: React.DragEvent,
  setIsDragging: (isDragging: boolean) => void
) => {
  e.preventDefault();
  e.stopPropagation();
  // Only set dragging to true if we're entering the main container
  if (e.currentTarget === e.target) {
    setIsDragging(true);
  }
}; 