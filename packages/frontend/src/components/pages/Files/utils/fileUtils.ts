/**
 * Utility functions for file operations
 */

/**
 * Checks if a file is an image based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is an image
 */
export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? imageExtensions.includes(`.${ext}`) : false;
};

/**
 * Checks if a file is a video based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is a video
 */
export const isVideoFile = (filename: string): boolean => {
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.wmv', '.flv'];
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? videoExtensions.includes(`.${ext}`) : false;
};

/**
 * Checks if a file is a document based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is a document
 */
export const isDocumentFile = (filename: string): boolean => {
  const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? documentExtensions.includes(`.${ext}`) : false;
};

/**
 * Gets the file type category based on its extension
 * @param filename - The name of the file
 * @returns string indicating the file type category
 */
export const getFileTypeCategory = (filename: string): string => {
  if (isImageFile(filename)) return 'Image';
  if (isVideoFile(filename)) return 'Video';
  if (isDocumentFile(filename)) return 'Document';
  return 'Unknown';
}; 