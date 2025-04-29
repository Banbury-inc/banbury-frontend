/**
 * Formats a file size in bytes to a human-readable string with appropriate unit
 * @param bytes - File size in bytes (can be number or string)
 * @returns Formatted string like "1.24 MB" or "800 KB"
 */
export const formatFileSize = (bytes: number | string): string => {
  // Convert input to number if it's a string
  const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  
  // Return '0 B' for invalid or zero size
  if (!size || isNaN(size) || size === 0) return '0 B';

  // Units for display
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  // Determine the appropriate unit
  const i = Math.floor(Math.log(size) / Math.log(1024));
  
  // Handle case where size is too large for our units
  if (i >= units.length) return `${(size / Math.pow(1024, units.length - 1)).toFixed(2)} ${units[units.length - 1]}`;
  
  // Format with 2 decimal places and the correct unit
  return `${(size / Math.pow(1024, i)).toFixed(2).replace(/\.00$/, '')} ${units[i]}`;
}; 