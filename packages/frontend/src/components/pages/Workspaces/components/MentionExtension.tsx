import path from 'path';

export interface MentionableFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  extension?: string;
}

// Helper functions for file processing
export const getFileExtension = (filename: string): string => {
  return path.extname(filename).toLowerCase();
};

export const getFileIcon = (filename: string): string => {
  const ext = getFileExtension(filename);
  const iconMap: { [key: string]: string } = {
    '.txt': '📄',
    '.md': '📝',
    '.js': '📜',
    '.ts': '📜',
    '.tsx': '⚛️',
    '.jsx': '⚛️',
    '.json': '🔧',
    '.html': '🌐',
    '.css': '🎨',
    '.pdf': '📕',
    '.doc': '📘',
    '.docx': '📘',
    '.xls': '📊',
    '.xlsx': '📊',
    '.png': '🖼️',
    '.jpg': '🖼️',
    '.jpeg': '🖼️',
    '.gif': '🖼️',
    '.mp4': '🎬',
    '.mp3': '🎵',
    '.zip': '📦',
    // Add more as needed
  };
  
  return iconMap[ext] || '📄';
};

export const isCodeFile = (filename: string): boolean => {
  const codeExtensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.html', '.css', '.json', '.xml', '.yaml', '.yml'];
  return codeExtensions.includes(getFileExtension(filename));
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}; 