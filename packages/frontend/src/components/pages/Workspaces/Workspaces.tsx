import React, { useState, useCallback, Suspense, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Allotment, LayoutPriority } from 'allotment';
import { AnimatePresence, motion } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAuth } from '../../../renderer/context/AuthContext';
import { useAlert } from '../../../renderer/context/AlertContext';
import FileTreeView from '../Files/components/NewTreeView/FileTreeView';

import WorkspaceAssistantInterface from './components/WorkspaceAssistantInterface';
import { ToolbarButton } from '../../common/ToolbarButton/ToolbarButton';
import SimpleTipTapEditor from './components/SimpleTipTapEditor';
import path from 'path';
import os from 'os';
import { stat, readFile, writeFile } from 'fs/promises';
import { shell } from 'electron';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import 'allotment/dist/style.css';
import ImageViewer from '../../common/FileViewer/ImageViewer/ImageViewer';
import { isImageFile } from '../Files/utils/fileUtils';
import { DatabaseData } from '@banbury/core/src/types';



// Navigation Toggle Button Component
const NavToggleButton = ({ 
  isCollapsed, 
  onClick, 
  direction 
}: { 
  isCollapsed: boolean; 
  onClick: () => void; 
  direction: 'left' | 'right';
}) => (
  <Box
    sx={{
      position: 'absolute',
      top: '50%',
      [direction === 'left' ? 'right' : 'left']: -12,
      transform: 'translateY(-50%)',
      zIndex: 1000,
    }}
  >
    <ToolbarButton
      onClick={onClick}
      sx={{
        paddingLeft: '4px', 
        paddingRight: '4px', 
        minWidth: '30px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        width: 24,
        height: 24,
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      <Typography sx={{ fontSize: '10px', fontWeight: 'bold' }}>
        {direction === 'left' 
          ? (isCollapsed ? '→' : '←')
          : (isCollapsed ? '←' : '→')
        }
      </Typography>
    </ToolbarButton>
  </Box>
);



// Workspace Sidebar Component
const WorkspaceSidebar = ({ 
  resetWorkspaceView,
  onFileClick,
  cloudFiles = [],
  cloudEnabled = true
}: { 
  resetWorkspaceView: () => void;
  onFileClick?: (fileName: string, filePath: string, fileType: string) => void;
  cloudFiles?: DatabaseData[];
  cloudEnabled?: boolean;
}) => {
  const [filePath, setFilePath] = useState('');
  const [filePathDevice, setFilePathDevice] = useState('');
  const [backHistory, setBackHistory] = useState<string[]>([]);
  const [forwardHistory, setForwardHistory] = useState<string[]>([]);
  const { username } = useAuth();

  // Helper function to get file type
  const getFileType = (fileName: string): string => {
    const ext = path.extname(fileName).toLowerCase();
    const fileTypes: { [key: string]: string } = {
      '.png': 'Image',
      '.jpg': 'Image', 
      '.jpeg': 'Image',
      '.gif': 'Image',
      '.bmp': 'Image',
      '.svg': 'Image',
      '.mp4': 'Video',
      '.mov': 'Video',
      '.avi': 'Video',
      '.mp3': 'Audio',
      '.wav': 'Audio',
      '.pdf': 'PDF',
      '.doc': 'Word Document',
      '.docx': 'Word Document',
      '.txt': 'Text',
      '.js': 'Code File',
      '.ts': 'Code File',
      '.tsx': 'Code File',
      '.jsx': 'Code File',
      '.py': 'Code File',
      '.java': 'Code File',
      '.cpp': 'Code File',
      '.c': 'Code File',
      '.html': 'Code File',
      '.css': 'Code File',
      '.json': 'Code File',
      '.xml': 'Code File',
      '.yaml': 'Code File',
      '.yml': 'Code File',
    };
    return fileTypes[ext] || 'Document';
  };

  // Custom file path handler that detects file clicks
  const handleFilePathChange = useCallback(async (newPath: string) => {
    console.log('File path changed:', newPath);
    
    // Check if the path points to a file
    try {
      if (newPath && newPath !== filePath && onFileClick) {
        // Check if this is a cloud file path
        if (newPath.startsWith('Core/Cloud/')) {
          // Extract the file name from the cloud path
          const fileName = path.basename(newPath);
          
          // Find the cloud file in the cloudFiles array
          const cloudFile = cloudFiles.find(file => 
            file.file_name === fileName || file.file_path === newPath
          );
          
          if (cloudFile && cloudFile.is_s3) {
            console.log('Detected cloud file click:', cloudFile);
            
            try {
              // Import the required functions
              const { banbury } = await import('@banbury/core');
              
              // Download the cloud file to local BCloud directory
              const localFilePath = await banbury.files.saveS3FileToBCloud(
                String(cloudFile._id || cloudFile.id),
                cloudFile.file_name
              );
              
              console.log('Cloud file downloaded to:', localFilePath);
              
              // Get file type
              const fileType = getFileType(fileName);
              
              // Open the downloaded local file
              await onFileClick(fileName, localFilePath, fileType);
              
              return; // Don't update filePath for cloud files
            } catch (error) {
              console.error('Error downloading and opening cloud file:', error);
              // Fall through to normal handling if cloud download fails
            }
          }
        }
        
        // Handle local files (existing logic)
        let actualPath = newPath;
        
        // If it's not an absolute path, it might be a relative path that needs conversion
        if (!path.isAbsolute(newPath)) {
          // For virtual paths like 'Core/Devices/...', we might need to convert them
          // to actual file system paths. For now, we'll pass them as-is.
          actualPath = newPath;
        }
        
        // Normalize the path for cross-platform compatibility
        actualPath = path.normalize(actualPath);
        
        // Check if it's a file by trying to stat it
        try {
          const fileStat = await stat(actualPath);
          if (fileStat.isFile()) {
            // It's a file, open it in the viewer
            const fileName = path.basename(actualPath);
            const fileType = getFileType(fileName);
            // Properly await the async onFileClick function and catch any errors
            try {
              await onFileClick(fileName, actualPath, fileType);
            } catch (fileClickError) {
              console.error('Error opening file:', fileClickError);
              // The error will be handled by the onFileClick function's own error handling
            }
            return; // Don't update filePath for files
          }
        } catch (error) {
          // If stat fails, it might not be a local file, proceed with normal navigation
          console.log('Could not stat file:', actualPath, error);
        }
      }
    } catch (error) {
      console.error('Error handling file path change:', error);
    }
    
    // For directories or navigation, update the file path
    setFilePath(newPath);
  }, [filePath, onFileClick, cloudFiles]);

  return (
      <Box sx={{ height: '100%', overflow: 'auto', minHeight: 0 }}>
        {username && (
          <FileTreeView
            filePath={filePath}
            setFilePath={handleFilePathChange}
            filePathDevice={filePathDevice}
            setFilePathDevice={setFilePathDevice}
            setBackHistory={setBackHistory}
            setForwardHistory={setForwardHistory}
            googleDriveFiles={[]}
            googleDriveEnabled={false}
            cloudFiles={cloudFiles}
            cloudEnabled={cloudEnabled}
          />
        )}
      </Box>
  );
};

// Welcome Screen Component
const WelcomeScreen = () => {
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      p: 4
    }}>
      <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
          Welcome to Workspaces
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
          Browse your files in the left panel and open documents, images, or other files to view them here. 
          Use the AI assistant on the right to get help with your work.
        </Typography>
      </Box>
    </Box>
  );
};

// Main Content Component - Shows documents, images, or welcome screen
const MainContent = ({ 
  currentFile,
  onDocumentChange,
  onCloseFile,
  onSaveDocument,
  getCurrentContent,
  setDocumentEditor
}: { 
  currentFile: { fileName: string; filePath: string; content?: string; fileType: string } | null;
  onDocumentChange: (content: string) => void;
  onCloseFile: () => void;
  onSaveDocument: (document: { fileName: string; filePath: string; content: string }) => void;
  getCurrentContent: () => string;
  setDocumentEditor: (editor: any) => void;
}) => {
  if (!currentFile) {
    return <WelcomeScreen />;
  }

  // Check if it's an image file
  if (isImageFile(currentFile.fileName)) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* File Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {currentFile.fileName}
          </Typography>
          <ToolbarButton
            onClick={onCloseFile}
            sx={{
              paddingLeft: '4px', 
              paddingRight: '4px', 
              minWidth: '30px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <CloseIcon fontSize="inherit" />
          </ToolbarButton>
        </Box>
        
        {/* Image Viewer */}
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <ImageViewer
            src={currentFile.filePath}
            alt={currentFile.fileName}
            fileName={currentFile.fileName}
          />
        </Box>
      </Box>
    );
  }

  // For documents, use SimpleTipTapEditor
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Document Header */}
      <Box sx={{ 
        p: 1, 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {currentFile.fileName}
        </Typography>
        <ToolbarButton
          onClick={onCloseFile}
          sx={{
            paddingLeft: '4px', 
            paddingRight: '4px', 
            minWidth: '30px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <CloseIcon fontSize="inherit" />
        </ToolbarButton>
      </Box>
      
      {/* TipTap Editor */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <SimpleTipTapEditor
          content={currentFile.content || ''}
          onChange={onDocumentChange}
          placeholder={`Start editing ${currentFile.fileName}...`}
          onSave={() => {
            const currentContent = getCurrentContent();
            onSaveDocument({
              ...currentFile,
              content: currentContent
            });
          }}
          onEditorReady={(editor) => {
            setDocumentEditor(editor);
          }}
        />
      </Box>
    </Box>
  );
};

// Main Workspaces Component
export default function Workspaces() {

  // Panel state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Document editing state
  const [showTipTapEditor, setShowTipTapEditor] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<{
    fileName: string;
    filePath: string;
    content: string;
  } | null>(null);

  // Document editing context for AI assistant
  const [documentEditor, setDocumentEditor] = useState<any>(null);
  const [currentDocumentContent, setCurrentDocumentContent] = useState<string>('');
  const [currentDocumentName, setCurrentDocumentName] = useState<string>('');

  // Image viewing context for AI assistant
  const [currentImageInfo, setCurrentImageInfo] = useState<{
    fileName: string;
    filePath: string;
    fileType: string;
    base64Data?: string | null;
    dimensions?: { width: number; height: number } | null;
    fileSize?: number;
  } | null>(null);
  const [currentImageName, setCurrentImageName] = useState<string>('');

  // File tabs state
  interface FileTab {
    id: string;
    fileName: string;
    filePath: string;
    fileType: string;
    content?: string;
  }
  const [openTabs, setOpenTabs] = useState<FileTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { showAlert } = useAlert();
  const { username, tasks, setTasks, setTaskbox_expanded } = useAuth();

  // Add Cloud Files state (similar to Files.tsx)
  const [cloudFiles, setCloudFiles] = useState<DatabaseData[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudEnabled] = useState(true); // Cloud is always enabled

  // Document AI Integration Functions
  const getDocumentInfo = useCallback(() => {
    return {
      hasDocument: showTipTapEditor && Boolean(currentDocument),
      fileName: currentDocument?.fileName || 'No Document',
      fileType: 'Text Document',
      filePath: currentDocument?.filePath || '',
      isWordDocument: false,
      content: currentDocumentContent
    };
  }, [showTipTapEditor, currentDocument, currentDocumentContent]);

  const getDocumentContent = useCallback(() => {
    if (!documentEditor) return '';
    try {
      return documentEditor.getHTML ? documentEditor.getHTML() : documentEditor.getText();
    } catch (error) {
      console.error('Error getting document content:', error);
      return currentDocumentContent;
    }
  }, [documentEditor, currentDocumentContent]);

  const setDocumentContent = useCallback((newContent: string) => {
    if (!documentEditor) {
      console.warn('No document editor available');
      return false;
    }
    
    try {
      if (documentEditor.commands && documentEditor.commands.setContent) {
        documentEditor.commands.setContent(newContent);
        setCurrentDocumentContent(newContent);
        return true;
      } else {
        console.warn('Document editor does not support setContent');
        return false;
      }
    } catch (error) {
      console.error('Error setting document content:', error);
      return false;
    }
  }, [documentEditor]);

  const insertDocumentContent = useCallback((content: string, position?: 'start' | 'end' | 'cursor') => {
    if (!documentEditor) return false;
    
    try {
      if (documentEditor.commands) {
        switch (position) {
          case 'start':
            documentEditor.commands.setTextSelection(0);
            documentEditor.commands.insertContent(content);
            break;
          case 'end':
            const endPos = documentEditor.state.doc.content.size;
            documentEditor.commands.setTextSelection(endPos);
            documentEditor.commands.insertContent(content);
            break;
          case 'cursor':
          default:
            documentEditor.commands.insertContent(content);
            break;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error inserting document content:', error);
      return false;
    }
  }, [documentEditor]);

  const replaceSelectedText = useCallback((newText: string) => {
    if (!documentEditor) return false;
    
    try {
      if (documentEditor.state.selection.from !== documentEditor.state.selection.to) {
        const { from, to } = documentEditor.state.selection;
        documentEditor.commands.deleteRange({ from, to }).insertContent(newText);
        return true;
      } else {
        // No selection, insert at cursor
        documentEditor.commands.insertContent(newText);
        return true;
      }
    } catch (error) {
      console.error('Error replacing selected text:', error);
      return false;
    }
  }, [documentEditor]);

  const documentActions = {
    getInfo: getDocumentInfo,
    getContent: getDocumentContent,
    setContent: setDocumentContent,
    insertContent: insertDocumentContent,
    replaceSelected: replaceSelectedText
  };

  // Image AI Integration Functions
  const getImageInfo = useCallback(() => {
    const activeTabData = openTabs.find(tab => tab.id === activeTab);
    const isCurrentlyViewingImage = activeTabData && isImageFile(activeTabData.fileName);
    
    return {
      hasImage: isCurrentlyViewingImage,
      fileName: currentImageInfo?.fileName || activeTabData?.fileName || 'No Image',
      fileType: currentImageInfo?.fileType || activeTabData?.fileType || '',
      filePath: currentImageInfo?.filePath || activeTabData?.filePath || '',
      dimensions: currentImageInfo?.dimensions,
      fileSize: currentImageInfo?.fileSize,
      base64Data: currentImageInfo?.base64Data
    };
  }, [activeTab, openTabs, currentImageInfo]);

  const getImageBase64 = useCallback(async (filePath?: string): Promise<string | null> => {
    try {
      const pathToUse = filePath || currentImageInfo?.filePath;
      if (!pathToUse) return null;
      
      // Read the file and convert to base64
      const fs = await import('fs/promises');
      const imageBuffer = await fs.readFile(pathToUse);
      const ext = path.extname(pathToUse).toLowerCase();
      
      // Determine MIME type
      let mimeType = 'image/jpeg';
      switch (ext) {
        case '.png': mimeType = 'image/png'; break;
        case '.gif': mimeType = 'image/gif'; break;
        case '.bmp': mimeType = 'image/bmp'; break;
        case '.svg': mimeType = 'image/svg+xml'; break;
        case '.webp': mimeType = 'image/webp'; break;
        default: mimeType = 'image/jpeg'; break;
      }

      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      // Update current image info with base64 data
      if (pathToUse === currentImageInfo?.filePath) {
        setCurrentImageInfo(prev => prev ? { ...prev, base64Data: dataUrl } : null);
      }
      
      return dataUrl;
    } catch (error) {
      console.error('Error reading image file:', error);
      return null;
    }
  }, [currentImageInfo]);

  const getImageDimensions = useCallback(async (filePath?: string): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
      const pathToUse = filePath || currentImageInfo?.filePath;
      if (!pathToUse) {
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const dimensions = { width: img.width, height: img.height };
        
        // Update current image info with dimensions
        if (pathToUse === currentImageInfo?.filePath) {
          setCurrentImageInfo(prev => prev ? { ...prev, dimensions } : null);
        }
        
        resolve(dimensions);
      };
      img.onerror = () => resolve(null);
      
      // Load the image from file path
      getImageBase64(pathToUse).then(base64Data => {
        if (base64Data) {
          img.src = base64Data;
        } else {
          resolve(null);
        }
      });
    });
  }, [currentImageInfo, getImageBase64]);

  const analyzeImage = useCallback(async (analysis: 'description' | 'metadata' | 'colors' | 'text') => {
    // This would be implemented with image analysis APIs or libraries
    // For now, return basic information
    const imageInfo = getImageInfo();
    if (!imageInfo.hasImage) return null;

    switch (analysis) {
      case 'metadata':
        return {
          fileName: imageInfo.fileName,
          fileSize: imageInfo.fileSize,
          dimensions: imageInfo.dimensions,
          format: path.extname(imageInfo.fileName).toUpperCase().replace('.', '')
        };
      case 'description':
        return 'Image analysis would require integration with vision APIs like OpenAI Vision or Google Vision';
      case 'colors':
        return 'Color analysis would require additional image processing libraries';
      case 'text':
        return 'OCR text extraction would require integration with OCR services';
      default:
        return null;
    }
  }, [getImageInfo]);

  const imageActions = {
    getInfo: getImageInfo,
    getBase64: getImageBase64,
    getDimensions: getImageDimensions,
    analyze: analyzeImage
  };

  // Keyboard shortcuts
  useHotkeys('ctrl+/', () => toggleRightPanel(), { preventDefault: true });
  useHotkeys('meta+/', () => toggleRightPanel(), { preventDefault: true });
  useHotkeys('ctrl+alt+/', () => toggleLeftPanel(), { preventDefault: true });
  useHotkeys('meta+alt+/', () => toggleLeftPanel(), { preventDefault: true });
  
  // Save document shortcut
  useHotkeys('ctrl+s', (event) => {
    event.preventDefault();
    if (currentDocument && showTipTapEditor) {
      saveDocument(currentDocument);
    }
  }, { preventDefault: true });
  useHotkeys('meta+s', (event) => {
    event.preventDefault();
    if (currentDocument && showTipTapEditor) {
      saveDocument(currentDocument);
    }
  }, { preventDefault: true });

  const resetWorkspaceView = () => {
    // Reset any workspace state if needed
  };

  // Determine if file should open in the middle panel (editor or viewer)
  const shouldOpenInMiddlePanel = (fileName: string): boolean => {
    const ext = path.extname(fileName).toLowerCase();
    const editableExtensions = ['.txt', '.md', '.markdown', '.rtf', '.doc', '.docx'];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];
    return editableExtensions.includes(ext) || imageExtensions.includes(ext);
  };

  // Convert plain text to HTML for TipTap
  const textToHtml = (text: string): string => {
    console.log('=== TEXT TO HTML CONVERSION ===');
    console.log('Input text:', text);
    console.log('Input text length:', text.length);
    
    try {
      if (!text || text.trim().length === 0) {
        console.log('Text is empty, returning default paragraph');
        return '<p></p>';
      }

      // Escape HTML entities to prevent XSS
      const escapeHtml = (unsafe: string) => {
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      // Split into paragraphs and convert to HTML
      const paragraphs = text.split(/\n\s*\n/);
      console.log('Split into paragraphs:', paragraphs.length);
      let html = '';

      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        const trimmed = paragraph.trim();
        console.log(`Processing paragraph ${i}:`, trimmed);
        
        if (!trimmed) {
          console.log(`Paragraph ${i} is empty, skipping`);
          continue;
        }

        // Check if it looks like a heading (starts with # for markdown)
        if (trimmed.startsWith('# ')) {
          const heading = escapeHtml(trimmed.substring(2).trim());
          html += `<h1>${heading}</h1>`;
          console.log(`Added H1: ${heading}`);
        } else if (trimmed.startsWith('## ')) {
          const heading = escapeHtml(trimmed.substring(3).trim());
          html += `<h2>${heading}</h2>`;
          console.log(`Added H2: ${heading}`);
        } else if (trimmed.startsWith('### ')) {
          const heading = escapeHtml(trimmed.substring(4).trim());
          html += `<h3>${heading}</h3>`;
          console.log(`Added H3: ${heading}`);
        } else {
          // Regular paragraph - preserve line breaks within paragraph
          const lines = trimmed.split('\n').map(line => line.trim()).filter(line => line);
          console.log(`Paragraph ${i} lines:`, lines);
          
          if (lines.length === 1) {
            const escapedLine = escapeHtml(lines[0]);
            html += `<p>${escapedLine}</p>`;
            console.log(`Added single line paragraph: ${escapedLine}`);
          } else if (lines.length > 1) {
            const escapedLines = lines.map(line => escapeHtml(line));
            html += `<p>${escapedLines.join('<br>')}</p>`;
            console.log(`Added multi-line paragraph with ${lines.length} lines`);
          }
        }
      }

      // If we still have no HTML content, create a paragraph with the raw text
      if (!html.trim()) {
        console.log('No HTML generated from paragraphs, using raw text');
        // Just wrap the entire text in a paragraph, replacing line breaks
        const cleanText = escapeHtml(text.trim()).replace(/\n/g, '<br>');
        html = `<p>${cleanText}</p>`;
      }

      console.log('Final HTML output:', html);
      console.log('=== END TEXT TO HTML CONVERSION ===');
      return html;
    } catch (error) {
      console.error('Error in textToHtml conversion:', error);
      // Fallback: return a simple paragraph with escaped text
      const fallbackText = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<p>${fallbackText}</p>`;
    }
  };

  // Convert HTML back to plain text/markdown for saving
  const htmlToText = (html: string, isMarkdown: boolean = false): string => {
    // Simple HTML to text conversion
    let text = html
      // Convert headings
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, isMarkdown ? '# $1\n\n' : '$1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, isMarkdown ? '## $1\n\n' : '$1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, isMarkdown ? '### $1\n\n' : '$1\n\n')
      // Convert paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      // Convert line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Remove other HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    return text || '';
  };

  // Save document to file system
  const saveDocument = useCallback(async (document: { fileName: string; filePath: string; content: string }) => {
    try {
      console.log('Saving document:', document.fileName);
      
      const ext = path.extname(document.fileName).toLowerCase();
      let textContent = '';
      let actualSavePath = document.filePath;

      if (ext === '.md' || ext === '.markdown') {
        // Save as markdown
        textContent = htmlToText(document.content, true);
      } else if (ext === '.txt' || ext === '.rtf') {
        // Save as plain text
        textContent = htmlToText(document.content, false);
      } else if (ext === '.docx' || ext === '.doc') {
        // For DOCX files, convert HTML back to DOCX format
        try {
          console.log('Converting HTML to DOCX format using docx library...');
          
          // Enhanced HTML parser that preserves formatting
          const htmlToDocxParagraphs = (htmlContent: string) => {
            const paragraphs: Paragraph[] = [];
            
            // Parse HTML and preserve basic formatting
            const parseElement = (element: string): TextRun[] => {
              const runs: TextRun[] = [];
              
              // Extract text and formatting
              let text = element;
              let isBold = false;
              let isItalic = false;
              let isUnderline = false;
              let isStrike = false;
              
              // Check for formatting tags
              if (text.includes('<strong>') || text.includes('<b>')) {
                isBold = true;
                text = text.replace(/<\/?(?:strong|b)>/g, '');
              }
              if (text.includes('<em>') || text.includes('<i>')) {
                isItalic = true;
                text = text.replace(/<\/?(?:em|i)>/g, '');
              }
              if (text.includes('<u>')) {
                isUnderline = true;
                text = text.replace(/<\/?u>/g, '');
              }
              if (text.includes('<s>') || text.includes('<del>')) {
                isStrike = true;
                text = text.replace(/<\/?(?:s|del)>/g, '');
              }
              
              // Clean up remaining HTML
              text = text
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/\s+/g, ' ')
                .trim();
              
              if (text) {
                runs.push(new TextRun({
                  text: text,
                  bold: isBold,
                  italics: isItalic,
                  underline: isUnderline ? {} : undefined,
                  strike: isStrike,
                }));
              }
              
              return runs;
            };
            
            // Split content into blocks
            const blocks = htmlContent
              .replace(/<script[^>]*>.*?<\/script>/gis, '')
              .replace(/<style[^>]*>.*?<\/style>/gis, '')
              .split(/(?=<(?:h[1-6]|p|div|blockquote|ul|ol|li))|(?<=<\/(?:h[1-6]|p|div|blockquote|ul|ol|li)>)/)
              .filter(block => block.trim());
            
            for (const block of blocks) {
              const trimmedBlock = block.trim();
              if (!trimmedBlock) continue;
              
              // Handle headings
              if (trimmedBlock.match(/^<h([1-6])[^>]*>/)) {
                const level = parseInt(trimmedBlock.match(/^<h([1-6])/)?.[1] || '1');
                const runs = parseElement(trimmedBlock);
                if (runs.length > 0) {
                  paragraphs.push(new Paragraph({
                    heading: level === 1 ? 'Heading1' : level === 2 ? 'Heading2' : 'Heading3',
                    children: runs
                  }));
                }
              }
              // Handle blockquotes
              else if (trimmedBlock.includes('<blockquote')) {
                const runs = parseElement(trimmedBlock);
                if (runs.length > 0) {
                  paragraphs.push(new Paragraph({
                    indent: { left: 720 }, // 0.5 inch indent
                    border: {
                      left: {
                        color: "auto",
                        space: 1,
                        size: 6,
                        style: "single",
                      },
                    },
                    children: runs
                  }));
                }
              }
              // Handle regular paragraphs
              else if (trimmedBlock.includes('<p') || !trimmedBlock.includes('<')) {
                const runs = parseElement(trimmedBlock);
                if (runs.length > 0) {
                  paragraphs.push(new Paragraph({
                    children: runs
                  }));
                }
              }
            }
            
            // Fallback if no paragraphs were created
            if (paragraphs.length === 0) {
              const fallbackText = htmlContent
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              
              paragraphs.push(new Paragraph({
                children: [new TextRun(fallbackText || "Document content")]
              }));
            }
            
            return paragraphs;
          };
          
          // Create DOCX document
          const doc = new Document({
            sections: [{
              properties: {},
              children: htmlToDocxParagraphs(document.content)
            }]
          });
          
          // Generate DOCX buffer
          const docxBuffer = await Packer.toBuffer(doc);
          
          // Write the DOCX buffer to file
          await writeFile(document.filePath, docxBuffer);
          
          console.log('Document saved successfully as DOCX');
          showAlert('Success', [`"${document.fileName}" saved successfully in DOCX format.`], 'success');
          
          return; // Early return to avoid the generic success message
        } catch (docxError) {
          console.error('Error converting to DOCX:', docxError);
          
          // Fallback: save as HTML if DOCX conversion fails
          const baseName = path.basename(document.fileName, ext);
          const dirName = path.dirname(document.filePath);
          actualSavePath = path.join(dirName, `${baseName}_edited.html`);
          
          textContent = document.content;
          await writeFile(actualSavePath, textContent, 'utf-8');
          
          showAlert('Warning', [
            `Could not save as DOCX format. Saved as HTML instead: "${baseName}_edited.html"`,
            `Error: ${docxError instanceof Error ? docxError.message : 'Unknown error'}`,
            'The document content has been preserved and can be reopened for further editing.'
          ], 'warning');
          
          return;
        }
      } else {
        // For other formats, save as plain text
        textContent = htmlToText(document.content, false);
      }

      await writeFile(actualSavePath, textContent, 'utf-8');
      console.log('Document saved successfully:', document.fileName);
      showAlert('Success', [`"${path.basename(actualSavePath)}" saved successfully.`], 'success');
    } catch (error) {
      console.error('Error saving document:', error);
      showAlert('Error', [`Failed to save "${document.fileName}": ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
    }
  }, [showAlert]);

  // Handle tab operations
  const handleCloseTab = useCallback((tabId: string) => {
    setOpenTabs(prev => {
      const tabToClose = prev.find(tab => tab.id === tabId);
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      // Clear image context if closing an image tab
      if (tabToClose && isImageFile(tabToClose.fileName) && activeTab === tabId) {
        setCurrentImageInfo(null);
        setCurrentImageName('');
      }
      
      // If closing the active tab, switch to another tab
      if (activeTab === tabId && newTabs.length > 0) {
        setActiveTab(newTabs[newTabs.length - 1].id);
      } else if (newTabs.length === 0) {
        setActiveTab(null);
        setShowTipTapEditor(false);
      }
      return newTabs;
    });
  }, [activeTab]);

  const handleSwitchTab = useCallback(async (tabId: string) => {
    setActiveTab(tabId);
    
    // Update image context when switching to an image tab
    const newActiveTab = openTabs.find(tab => tab.id === tabId);
    if (newActiveTab && isImageFile(newActiveTab.fileName)) {
      try {
        // Get file size
        const fs = await import('fs/promises');
        const stats = await fs.stat(newActiveTab.filePath);
        
        // Load base64 data immediately
        const base64Data = await getImageBase64(newActiveTab.filePath);
        const dimensions = await getImageDimensions(newActiveTab.filePath);
        
        setCurrentImageInfo({
          fileName: newActiveTab.fileName,
          filePath: newActiveTab.filePath,
          fileType: newActiveTab.fileType,
          fileSize: stats.size,
          base64Data,
          dimensions
        });
        setCurrentImageName(newActiveTab.fileName);
      } catch (error) {
        console.error('Error updating image context on tab switch:', error);
      }
    } else {
      // Clear image context when switching to non-image tab
      setCurrentImageInfo(null);
      setCurrentImageName('');
    }
  }, [openTabs, getImageDimensions, getImageBase64]);

  // Load document content without updating UI
  const loadDocumentContent = async (fileName: string, filePath: string): Promise<string> => {
    try {
      const ext = path.extname(fileName).toLowerCase();
      let content = '';

      if (ext === '.docx' || ext === '.doc') {
        const buffer = await readFile(filePath);
        const isActualDocx = buffer.length > 4 && 
          buffer[0] === 0x50 && buffer[1] === 0x4B &&
          (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);
        
        if (!isActualDocx) {
          // Plain text file with docx extension
          const fileText = buffer.toString('utf-8');
          if (fileText.trim().startsWith('<') && fileText.includes('>')) {
            content = fileText;
          } else {
            content = fileText.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
          }
        } else {
          // Actual DOCX file
          const result = await mammoth.convertToHtml({ buffer });
          content = result.value || '<p>Document appears to be empty.</p>';
        }
      } else {
        // Text files
        const fileContent = await readFile(filePath, 'utf-8');
        if (ext === '.md' || ext === '.markdown') {
          content = fileContent; // Let TipTap handle markdown
        } else {
          content = fileContent.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
        }
      }

      return content || '<p><em>This file appears to be empty.</em></p>';
    } catch (error) {
      console.error('Error loading document content:', error);
      throw error;
    }
  };

  // Set current document for AI assistant context
  const openInTipTap = useCallback(async (fileName: string, filePath: string) => {
    try {
      const content = await loadDocumentContent(fileName, filePath);
      
      setCurrentDocument({
        fileName,
        filePath,
        content
      });
      setCurrentDocumentContent(content);
      setCurrentDocumentName(fileName);
      setShowTipTapEditor(true);
    } catch (error) {
      console.error('Error opening document:', error);
      showAlert('Error', [`Failed to open "${fileName}": ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
    }
  }, [showAlert]);

  // Open file (documents or images) in the middle panel
  const openFileInMiddlePanel = useCallback(async (fileName: string, filePath: string, fileType: string) => {
    try {
      // Generate unique tab ID
      const tabId = `${fileName}-${Date.now()}`;
      
      // Check if file is already open
      const existingTab = openTabs.find(tab => tab.filePath === filePath);
      if (existingTab) {
        setActiveTab(existingTab.id);
        return;
      }

      let fileContent: string | undefined;
      
      // For document files, load the content first
      const ext = path.extname(fileName).toLowerCase();
      if (['.docx', '.doc', '.txt', '.md', '.markdown', '.rtf'].includes(ext)) {
        // Load document content but don't set UI state yet
        const content = await loadDocumentContent(fileName, filePath);
        fileContent = content;
      }

      // For image files, set image context
      if (isImageFile(fileName)) {
        try {
          // Get file size
          const fs = await import('fs/promises');
          const stats = await fs.stat(filePath);
          
          // Load base64 data immediately
          const base64Data = await getImageBase64(filePath);
          const dimensions = await getImageDimensions(filePath);
          
          setCurrentImageInfo({
            fileName,
            filePath,
            fileType,
            fileSize: stats.size,
            base64Data,
            dimensions
          });
          setCurrentImageName(fileName);
        } catch (error) {
          console.error('Error setting image context:', error);
        }
      }

      // Add new tab
      const newTab: FileTab = {
        id: tabId,
        fileName,
        filePath,
        fileType,
        content: fileContent
      };

      setOpenTabs(prev => [...prev, newTab]);
      setActiveTab(tabId);
      setShowTipTapEditor(true);
    } catch (error) {
      console.error('Error opening file:', error);
      showAlert('Error', [`Failed to open "${fileName}": ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
    }
  }, [openTabs, showAlert, openInTipTap, currentDocumentContent, getImageDimensions, getImageBase64]);

  // File handling - TipTap for documents, system default for others
  const handleFileClick = useCallback(async (fileName: string, filePath: string, fileType: string) => {
    console.log('=== HANDLE FILE CLICK DEBUG ===');
    console.log('File clicked:', fileName);
    console.log('Original file path:', filePath);
    console.log('File type:', fileType);
    
    // Normalize the path for cross-platform compatibility
    const normalizedPath = path.normalize(filePath);
    console.log('Normalized path:', normalizedPath);
    console.log('Path is absolute:', path.isAbsolute(normalizedPath));
    
    console.log('Should open in middle panel:', shouldOpenInMiddlePanel(fileName));
    
    if (shouldOpenInMiddlePanel(fileName)) {
      // Open file in middle panel (editor or viewer)
      console.log('Opening in middle panel with path:', normalizedPath);
      try {
        await openFileInMiddlePanel(fileName, normalizedPath, fileType);
      } catch (error) {
        console.error('Failed to open file in middle panel:', error);
        showAlert('Error', [`Failed to open "${fileName}": ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
      }
    } else {
      // Open other files with system default application
      console.log('Opening with system default application');
      try {
        await shell.openPath(normalizedPath);
      } catch (error) {
        console.error('Failed to open file with system app:', error);
        showAlert('Error', [`Failed to open "${fileName}" with system application.`], 'error');
      }
    }
    console.log('=== END HANDLE FILE CLICK DEBUG ===');
  }, [showAlert, openFileInMiddlePanel]);

  // Handle document editor changes for FileViewerTabs
  const handleDocumentEditorChange = useCallback((editor: any, content: string, fileName: string) => {
    setDocumentEditor(editor);
    setCurrentDocumentContent(content);
    setCurrentDocumentName(fileName);
    
    // Update current document if it matches the fileName
    if (currentDocument?.fileName === fileName) {
      setCurrentDocument({
        ...currentDocument,
        content
      });
    }
  }, [currentDocument]);

  const toggleLeftPanel = () => {
    const newLeftCollapsed = !leftPanelCollapsed;
    updatePanelStates(newLeftCollapsed, rightPanelOpen);
  };

  const toggleRightPanel = () => {
    const newRightOpen = !rightPanelOpen;
    updatePanelStates(leftPanelCollapsed, newRightOpen);
  };

  // Use refs to track current state and avoid stale closures
  const panelStateRef = useRef({ leftCollapsed: false, rightOpen: false });
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced state update to prevent ResizeObserver loops
  const updatePanelStates = useCallback((leftCollapsed: boolean, rightOpen: boolean) => {
    // Clear any pending updates
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // Only update if state actually changed
    if (panelStateRef.current.leftCollapsed !== leftCollapsed || 
        panelStateRef.current.rightOpen !== rightOpen) {
      
      // Update ref immediately to prevent duplicate updates
      panelStateRef.current = { leftCollapsed, rightOpen };
      
      // Debounce the actual state update
      resizeTimeoutRef.current = setTimeout(() => {
        setLeftPanelCollapsed(leftCollapsed);
        setRightPanelOpen(rightOpen);
      }, 16); // One frame delay to prevent ResizeObserver loops
    }
  }, []);

  const onAllotmentChange = useCallback(([leftWidth, middleWidth, rightWidth]: number[]) => {
    const newLeftCollapsed = leftWidth === undefined || leftWidth === 0;
    const newRightOpen = rightWidth !== undefined && rightWidth > 0;
    
    updatePanelStates(newLeftCollapsed, newRightOpen);
  }, [updatePanelStates]);

  // Add Cloud Files fetching effect (similar to Files.tsx)
  useEffect(() => {
    const fetchCloudFilesData = async () => {
      if (!username) return;

      // Fetch Cloud files for tree display
      setIsCloudLoading(true);
      setCloudError(null);

      try {
        const { fetchCloudData } = await import('../Files/utils/fetchAllData');
        const result = await fetchCloudData();
        setCloudFiles(result);
      } catch (error: any) {
        console.error('Error fetching Cloud files for Workspaces:', error);
        setCloudError(error.message || 'Failed to load Cloud files');
        setCloudFiles([]);
      } finally {
        setIsCloudLoading(false);
      }
    };

    fetchCloudFilesData();
  }, [username]);

  // Sync initial state with ref
  useEffect(() => {
    panelStateRef.current = { leftCollapsed: leftPanelCollapsed, rightOpen: rightPanelOpen };
  }, [leftPanelCollapsed, rightPanelOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Box sx={{ 
      position: 'fixed',
      top: 40,
      left: 40, // Add left padding to avoid overlapping with navigation sidebar
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default'
    }}>
      {/* Main Content - Three Panel Layout */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Suspense fallback={<LinearProgress />}>
          <Allotment
            proportionalLayout={false}
            onChange={onAllotmentChange}
            separator={false}
          >
            {/* Left Panel - File Tree */}
            <Allotment.Pane
              snap
              preferredSize={250}
              visible={!leftPanelCollapsed}
              maxSize={800}
              minSize={250}
              priority={LayoutPriority.Low}
            >
              <Box sx={{ height: '100%', borderRight: 1, borderColor: 'divider', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <WorkspaceSidebar 
                  resetWorkspaceView={resetWorkspaceView} 
                  onFileClick={handleFileClick}
                  cloudFiles={cloudFiles}
                  cloudEnabled={cloudEnabled}
                />
                {/* Left Panel Toggle Button (when panel is open) */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    right: -12,
                    transform: 'translateY(-50%)',
                    zIndex: 1000,
                  }}
                >
                  <ToolbarButton
                    onClick={toggleLeftPanel}
                    sx={{
                      paddingLeft: '4px', 
                      paddingRight: '4px', 
                      minWidth: '30px',
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      width: 24,
                      height: 24,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: '10px', fontWeight: 'bold' }}>
                      ←
                    </Typography>
                  </ToolbarButton>
                </Box>
              </Box>
            </Allotment.Pane>

            {/* Middle Panel - Main Content */}
            <Allotment.Pane
              priority={LayoutPriority.High}
              minSize={400}
              preferredSize="75%"
            >
              <Box sx={{ height: '100%', borderRight: rightPanelOpen ? 1 : 0, borderColor: 'divider' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key="main-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ height: '100%' }}
                  >
                    {openTabs.length > 0 ? (
                      <MainContent
                        currentFile={openTabs.find(tab => tab.id === activeTab) || null}
                        onDocumentChange={(content) => {
                          setCurrentDocumentContent(content);
                          // Update the content in the tab
                          setOpenTabs(prev => prev.map(tab => 
                            tab.id === activeTab 
                              ? { ...tab, content } 
                              : tab
                          ));
                        }}
                        onCloseFile={() => handleCloseTab(activeTab || '')}
                        onSaveDocument={saveDocument}
                        getCurrentContent={() => {
                          const activeTabData = openTabs.find(tab => tab.id === activeTab);
                          return activeTabData?.content || currentDocumentContent;
                        }}
                        setDocumentEditor={setDocumentEditor}
                      />
                    ) : (
                      <WelcomeScreen />
                    )}
                  </motion.div>
                </AnimatePresence>
              </Box>
            </Allotment.Pane>

            {/* Right Panel - AI Assistant */}
            <Allotment.Pane
              snap
              preferredSize={400}
              minSize={400}
              priority={LayoutPriority.Normal}
              visible={rightPanelOpen}
              maxSize={800}
            >
              <Box sx={{ height: '100%', position: 'relative' }}>
                <WorkspaceAssistantInterface documentActions={documentActions} imageActions={imageActions} />
                {/* Right Panel Toggle Button (when panel is open) */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: -12,
                    transform: 'translateY(-50%)',
                    zIndex: 1000,
                  }}
                >
                  <ToolbarButton
                    onClick={toggleRightPanel}
                    sx={{
                      paddingLeft: '4px', 
                      paddingRight: '4px', 
                      minWidth: '30px',
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      width: 24,
                      height: 24,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: '10px', fontWeight: 'bold' }}>
                      →
                    </Typography>
                  </ToolbarButton>
                </Box>
              </Box>
            </Allotment.Pane>
          </Allotment>
        </Suspense>

        {/* Toggle Button for collapsed left panel */}
        {leftPanelCollapsed && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: -12,
              transform: 'translateY(-50%)',
              zIndex: 1000,
            }}
          >
            <ToolbarButton
              onClick={toggleLeftPanel}
              sx={{
                paddingLeft: '4px', 
                paddingRight: '4px', 
                minWidth: '30px',
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                width: 24,
                height: 24,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <Typography sx={{ fontSize: '10px', fontWeight: 'bold' }}>
                →
              </Typography>
            </ToolbarButton>
          </Box>
        )}

        {/* Toggle Button for collapsed right panel */}
        {!rightPanelOpen && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              right: -12,
              transform: 'translateY(-50%)',
              zIndex: 1000,
            }}
          >
            <ToolbarButton
              onClick={toggleRightPanel}
              sx={{
                paddingLeft: '4px', 
                paddingRight: '4px', 
                minWidth: '30px',
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                width: 24,
                height: 24,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <Typography sx={{ fontSize: '10px', fontWeight: 'bold' }}>
                ←
              </Typography>
            </ToolbarButton>
          </Box>
        )}
      </Box>
    </Box>
  );
} 