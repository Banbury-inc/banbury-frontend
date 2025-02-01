
// Add this utility function at the top of the file, outside of any component
export function formatRAM(capacity: string | number): string {
  // Convert capacity to number if it's a string
 const capacityInBytes = typeof capacity === 'string' ? parseFloat(capacity) : capacity;

  // If conversion failed or capacity is not a valid number, return as is
  if (isNaN(capacityInBytes)) {
    return capacity as string; // Return original string for invalid input, e.g., 'N/A'
  }

  // Check size and convert to MB or GB as needed
  if (capacityInBytes >= 1e9) { // Greater than or equal to 1 GB
    return `${(capacityInBytes / 1e9).toFixed(2)} GB`;
  } else if (capacityInBytes >= 1e6) { // Greater than or equal to 1 MB
    return `${(capacityInBytes / 1e6).toFixed(2)} MB`;
  } else {
    return `${capacityInBytes} bytes`; // For smaller values, return in bytes
  }
}

