export const handleDragOver = (
  e: React.DragEvent,
  isDragging: boolean,
  setIsDragging: (isDragging: boolean) => void
) => {
  e.preventDefault();
  e.stopPropagation();
  // Keep dragging state true while over any part of the container
  if (!isDragging) {
    setIsDragging(true);
  }
}; 