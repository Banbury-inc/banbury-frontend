/**
 * Utility functions for file operations
 */

/**
 * Checks if a file is an image based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is an image
 */
export const isImageFile = (fileName: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff'];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return imageExtensions.includes(extension);
};

/**
 * Checks if a file is a video based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is a video
 */
export const isVideoFile = (filename: string): boolean => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp'];
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? videoExtensions.includes(`.${ext}`) : false;
};

/**
 * Checks if a file is a document based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is a document
 */
export const isDocumentFile = (filename: string): boolean => {
  const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.txt'];
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? documentExtensions.includes(`.${ext}`) : false;
};

/**
 * Checks if a file is a PDF based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is a PDF
 */
export const isPdfFile = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith('.pdf');
};

/**
 * Checks if a file is a Word document based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is a Word document
 */
export const isWordFile = (fileName: string): boolean => {
  const wordExtensions = ['.doc', '.docx'];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return wordExtensions.includes(extension);
};

/**
 * Checks if a file is an Excel spreadsheet based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is an Excel spreadsheet
 */
export const isExcelFile = (fileName: string): boolean => {
  const excelExtensions = ['.xls', '.xlsx'];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return excelExtensions.includes(extension);
};

/**
 * Checks if a file is a CSV file based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is a CSV file
 */
export const isCsvFile = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith('.csv');
};

/**
 * Checks if a file is a spreadsheet (Excel or CSV) based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is a spreadsheet
 */
export const isSpreadsheetFile = (filename: string): boolean => {
  return isExcelFile(filename) || isCsvFile(filename);
};

/**
 * Checks if a file is a code file based on its extension
 * @param filename - The name of the file
 * @returns boolean indicating if the file is a code file
 */
export const isCodeFile = (fileName: string): boolean => {
  const codeExtensions = [
    // Web technologies
    '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
    
    // Programming languages
    '.py', '.java', '.c', '.cpp', '.cxx', '.cc', '.h', '.hpp', '.cs', '.php',
    '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.m', '.mm',
    '.pl', '.pm', '.lua', '.vim',
    
    // Shell scripting
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
    
    // Configuration and documentation
    '.md', '.markdown', '.txt', '.log', '.gitignore', '.env', '.dockerfile',
    '.sql', '.graphql', '.proto'
  ];
  
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return codeExtensions.includes(extension);
};

/**
 * Gets the file type category based on its extension
 * @param filename - The name of the file
 * @returns string indicating the file type category
 */
export const getFileTypeCategory = (filename: string): string => {
  if (isImageFile(filename)) return 'Image';
  if (isVideoFile(filename)) return 'Video';
  if (isPdfFile(filename)) return 'PDF';
  if (isWordFile(filename)) return 'Word Document';
  if (isExcelFile(filename)) return 'Excel Spreadsheet';
  if (isCsvFile(filename)) return 'CSV File';
  if (isDocumentFile(filename)) return 'Document';
  if (isCodeFile(filename)) return 'Code File';
  return 'Unknown';
};

/**
 * Checks if a file is viewable in the app
 * @param filename - The name of the file
 * @returns boolean indicating if the file is viewable in the app
 */
export const isViewableInApp = (fileName: string): boolean => {
  return isImageFile(fileName) || 
         isPdfFile(fileName) || 
         isWordFile(fileName) || 
         isExcelFile(fileName) || 
         isCsvFile(fileName) ||
         isCodeFile(fileName);
}; 