/**
 * Formats a date string into a human-readable format.
 * @param dateStr - Date string in YYYY-MM-DD HH:MM:SS format or ISO 8601 format
 * @returns Formatted date string (e.g., "Apr 21, 2023, 2:30 PM")
 */
export const formatDate = (dateStr: string | undefined): string => {
  // Return empty string if date is undefined/empty
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      // If the date isn't in ISO format, try parsing a common format like "YYYY-MM-DD HH:MM:SS"
      const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (parts) {
        const [_, year, month, day, hour, minute, second] = parts;
        const newDate = new Date(
          parseInt(year),
          parseInt(month) - 1, // Month is 0-indexed in JS
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
        
        if (!isNaN(newDate.getTime())) {
          return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }).format(newDate);
        }
      }
      
      // If all parsing attempts fail, return the original string
      return dateStr;
    }
    
    // Format the date using Intl.DateTimeFormat
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    // If there's any error in parsing, return the original string
    return dateStr;
  }
}; 