import React, { useState, useCallback, Suspense, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Card,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { Allotment, LayoutPriority } from 'allotment';
import { AnimatePresence, motion } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAuth } from '../../../renderer/context/AuthContext';
import { useAlert } from '../../../renderer/context/AlertContext';
import FileTreeView from '../Files/components/NewTreeView/FileTreeView';
import FilesToolbar from '../Files/components/FilesToolbar/FilesToolbar';
import { ViewType as FileViewType } from '../Files/components/FilesToolbar/ChangeViewButton/ChangeViewButton';
import { AvailableTableColumns } from '@banbury/core/src/types';
import WorkspaceAssistantInterface from './components/WorkspaceAssistantInterface';
import { ToolbarButton } from '../../common/ToolbarButton/ToolbarButton';
import SimpleTipTapEditor from './components/SimpleTipTapEditor';
import RenameableTitle from './components/RenameableTitle';
import path from 'path';
import os from 'os';
import { stat, readFile, writeFile } from 'fs/promises';
import { shell } from 'electron';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import 'allotment/dist/style.css';
import ImageViewer from '../../common/FileViewer/ImageViewer/ImageViewer';
import SpreadsheetEditor from '../../common/FileViewer/ExcelViewer/SpreadsheetEditor';
import PDFViewer from '../../common/FileViewer/PDFViewer/PDFViewer';
import { isImageFile, isExcelFile, isCsvFile, isPdfFile } from '../Files/utils/fileUtils';
import { DatabaseData } from '@banbury/core/src/types';



// Workspace Sidebar Component
const WorkspaceSidebar = ({ 
  onFileClick,
  cloudFiles = [],
  cloudEnabled = true,
  filePath,
  setFilePath
}: { 
  onFileClick?: (fileName: string, filePath: string, fileType: string) => void;
  cloudFiles?: DatabaseData[];
  cloudEnabled?: boolean;
  filePath: string;
  setFilePath: (path: string) => void;
}) => {
  const [filePathDevice, setFilePathDevice] = useState('');
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
      '.xlsx': 'Excel Spreadsheet',
      '.xls': 'Excel Spreadsheet',
      '.csv': 'CSV File',
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
    // Check if the path points to a file
    try {
      if (newPath && newPath !== filePath && onFileClick) {
        // Check if this is a cloud file path
        if (newPath.startsWith('Core/Cloud/')) {
          // Extract the file name from the cloud path
          const fileName = path.basename(newPath);
          
          // Find the matching cloud file
          const cloudFile = cloudFiles.find((file: DatabaseData) => 
            file.file_name === fileName || file.file_path === newPath
          );
          
          if (cloudFile && cloudFile.is_s3) {
            try {
              // Import the required functions
              const { banbury } = await import('@banbury/core');
              
              // Download the cloud file to local BCloud directory
              const localFilePath = await banbury.files.saveS3FileToBCloud(
                String(cloudFile._id || cloudFile.id),
                cloudFile.file_name
              );
              
              // Get file type
              const fileType = getFileType(fileName);
              
              // Open the downloaded local file
              await onFileClick(fileName, localFilePath, fileType);
              
              return; // Don't update filePath for cloud files
            } catch {
              // Fall through to normal handling if cloud download fails
            }
          }
        }
        
        // Handle local files
        let actualPath = newPath;
        
        // If it's not an absolute path, it might be a relative path that needs conversion
        if (!path.isAbsolute(newPath)) {
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
            try {
              await onFileClick(fileName, actualPath, fileType);
            } catch {
              // The error will be handled by the onFileClick function's own error handling
            }
            return; // Don't update filePath for files
          }
                  } catch {
            // If stat fails, it might not be a local file, proceed with normal navigation
          }
      }
          } catch {
        // Handle errors silently
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
            setBackHistory={() => {}}
            setForwardHistory={() => {}}
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
  onSaveSpreadsheet,
  getCurrentContent,
  setDocumentEditor,
  onRenameFile,
  spreadsheetEditorRef,
}: { 
  currentFile: { fileName: string; filePath: string; content?: string; fileType: string } | null;
  onDocumentChange: (content: string) => void;
  onCloseFile: () => void;
  onSaveDocument: (document: { fileName: string; filePath: string; content: string }) => void;
  onSaveSpreadsheet: (filePath: string) => void;
  getCurrentContent: () => string;
  setDocumentEditor: (editor: any) => void;
  onRenameFile?: (oldFileName: string, newFileName: string) => void;
  spreadsheetEditorRef: React.RefObject<{ save: () => Promise<void> }>;
  documentEditorRef: React.RefObject<any>;
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
          pl: 1, 
          pr: 1, 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <RenameableTitle
            title={currentFile.fileName}
            variant="inherit"
            isDocument={isImageFile(currentFile.fileName)}
            onRename={(newFileName) => {
              if (onRenameFile) {
                onRenameFile(currentFile.fileName, newFileName);
              }
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

  // Check if it's an Excel/CSV file
  if (isExcelFile(currentFile.fileName) || isCsvFile(currentFile.fileName)) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* File Header */}
        <Box sx={{ 
          pl: 1, 
          pr: 1, 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <RenameableTitle
            title={currentFile.fileName}
            variant="inherit"
            isDocument={true}
            onRename={(newFileName) => {
              if (onRenameFile) {
                onRenameFile(currentFile.fileName, newFileName);
              }
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToolbarButton
              onClick={() => spreadsheetEditorRef.current?.save()}
              sx={{
                paddingLeft: '2px', 
                paddingRight: '2px', 
                minWidth: '30px',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <SaveIcon fontSize="inherit" />
            </ToolbarButton>
            <ToolbarButton
              onClick={onCloseFile}
              sx={{
                paddingLeft: '2px', 
                paddingRight: '2px', 
                minWidth: '30px',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <CloseIcon fontSize="inherit" />
            </ToolbarButton>
          </Box>
        </Box>
        
        {/* Spreadsheet Editor */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <SpreadsheetEditor
            ref={spreadsheetEditorRef}
            src={currentFile.filePath}
            fileName={currentFile.fileName}
            onError={() => {
              console.error('Error loading Excel file:', currentFile.fileName);
            }}
            onSave={onSaveSpreadsheet}
          />
        </Box>
      </Box>
    );
  }

  // Check if it's a PDF file
  if (isPdfFile(currentFile.fileName)) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* File Header */}
        <Box sx={{ 
          pl: 1, 
          pr: 1, 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <RenameableTitle
            title={currentFile.fileName}
            variant="inherit"
            isDocument={false}
            onRename={(newFileName) => {
              if (onRenameFile) {
                onRenameFile(currentFile.fileName, newFileName);
              }
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
        </Box>
        
        {/* PDF Viewer */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <PDFViewer
            src={currentFile.filePath}
            fileName={currentFile.fileName}
            onError={() => {
              console.error('Error loading PDF file:', currentFile.fileName);
            }}
            onLoad={() => {
              // PDF file loaded successfully
            }}
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
        pl: 1, 
        pr: 1, 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
                  <RenameableTitle
            title={currentFile.fileName}
            variant="inherit"
            isDocument={true}
            onRename={(newFileName) => {
              if (onRenameFile) {
                onRenameFile(currentFile.fileName, newFileName);
              }
            }}
          />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ToolbarButton
            onClick={() => {
              const currentContent = getCurrentContent();
              onSaveDocument({
                ...currentFile,
                content: currentContent
              });
            }}
            startIcon={<SaveIcon />}
            size="small"
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Save
          </ToolbarButton>
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
      </Box>
      
      {/* TipTap Editor */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <SimpleTipTapEditor
          content={currentFile.content || ''}
          onChange={onDocumentChange}
          _placeholder={`Start editing ${currentFile.fileName}...`}
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

  // Toolbar state
  const [viewType, setViewType] = useState<FileViewType>('list');
  const [columnVisibility, setColumnVisibility] = useState<Partial<Record<AvailableTableColumns, boolean>>>({
    file_name: true,
    file_size: true,
    kind: true,
    original_device: true,
    available: true,
    is_public: false,
    file_priority: true,
    date_uploaded: true,
    date_modified: false,
  });
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [selectedDeviceNames] = useState<string[]>([]);
  const [_selectedFileInfo] = useState<any[]>([]);
  const [_backHistory, setBackHistory] = useState<string[]>([]);
  const [_forwardHistory, setForwardHistory] = useState<string[]>([]);
  const [filePath, setFilePath] = useState<string>('');

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


  // Image viewing context for AI assistant
  const [currentImageInfo, setCurrentImageInfo] = useState<{
    fileName: string;
    filePath: string;
    fileType: string;
    base64Data?: string | null;
    dimensions?: { width: number; height: number } | null;
    fileSize?: number;
  } | null>(null);

  // PDF viewing context for AI assistant
  const [currentPdfInfo, setCurrentPdfInfo] = useState<{
    fileName: string;
    filePath: string;
    fileType: string;
    numPages?: number;
    fileSize?: number;
  } | null>(null);


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
  const { username, devices, websocket, tasks, setTasks, setTaskbox_expanded } = useAuth();

  // Add Cloud Files state (similar to Files.tsx)
  const [cloudFiles, setCloudFiles] = useState<DatabaseData[]>([]);

  const [cloudEnabled] = useState(true); // Cloud is always enabled

  // Refs for editor components
  const spreadsheetEditorRef = useRef<{ save: () => Promise<void> }>(null);
  const documentEditorRef = useRef<any>(null);

  // Toolbar handler functions
  const handleShareModalOpen = () => {
    // TODO: Implement share modal for workspaces
    showAlert('Info', ['Share functionality will be implemented for workspaces'], 'info');
  };

  const handleColumnVisibilityChange = (columnId: AvailableTableColumns, isVisible: boolean) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: isVisible
    }));
  };

  const getColumnOptions = () => {
    // Define which columns to show and their display labels (based on AvailableTableColumns)
    const columnLabels: Record<AvailableTableColumns, string> = {
      file_name: 'File Name',
      file_size: 'File Size',
      kind: 'Kind',
      original_device: 'Location',
      available: 'Status',
      file_priority: 'Priority',
      date_uploaded: 'Date Uploaded',
      date_modified: 'Date Modified',
      is_public: 'Visibility',
    };

    // Define which columns should be available for toggling (AvailableTableColumns)
    const availableColumns: AvailableTableColumns[] = [
      'file_name',
      'file_size',
      'kind',
      'original_device',
      'available',
      'file_priority',
      'date_uploaded',
      'date_modified',
      'is_public'
    ];

    return availableColumns.map((columnId) => ({
      id: columnId,
      label: columnLabels[columnId],
      isVisible: columnVisibility[columnId] ?? true // Default to visible if not set
    }));
  };

  const handleFinish = () => {
    setSelectedFileNames([]);
  };

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
          case 'end': {
            const endPos = documentEditor.state.doc.content.size;
            documentEditor.commands.setTextSelection(endPos);
            documentEditor.commands.insertContent(content);
            break;
          }
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

  // PDF AI Integration Functions
  const getPdfInfo = useCallback(() => {
    const activeTabData = openTabs.find(tab => tab.id === activeTab);
    const isCurrentlyViewingPdf = activeTabData && isPdfFile(activeTabData.fileName);
    
    return {
      hasPdf: isCurrentlyViewingPdf,
      fileName: currentPdfInfo?.fileName || activeTabData?.fileName || 'No PDF',
      fileType: currentPdfInfo?.fileType || activeTabData?.fileType || '',
      filePath: currentPdfInfo?.filePath || activeTabData?.filePath || '',
      numPages: currentPdfInfo?.numPages,
      fileSize: currentPdfInfo?.fileSize
    };
  }, [activeTab, openTabs, currentPdfInfo]);

  const getPdfMetadata = useCallback(async (filePath?: string): Promise<any | null> => {
    try {
      const pathToUse = filePath || currentPdfInfo?.filePath;
      if (!pathToUse) return null;
      
      // Get file size
      const fs = await import('fs/promises');
      const stats = await fs.stat(pathToUse);
      
      return {
        fileName: currentPdfInfo?.fileName || path.basename(pathToUse),
        fileSize: stats.size,
        numPages: currentPdfInfo?.numPages,
        filePath: pathToUse
      };
    } catch (error) {
      console.error('Error getting PDF metadata:', error);
      return null;
    }
  }, [currentPdfInfo]);

  const pdfActions = {
    getInfo: getPdfInfo,
    getMetadata: getPdfMetadata
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



  // Determine if file should open in the middle panel (editor or viewer)
  const shouldOpenInMiddlePanel = (fileName: string): boolean => {
    const ext = path.extname(fileName).toLowerCase();
    const editableExtensions = ['.txt', '.md', '.markdown', '.rtf', '.doc', '.docx'];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];
    const spreadsheetExtensions = ['.xlsx', '.xls', '.csv'];
    const pdfExtensions = ['.pdf'];
    return editableExtensions.includes(ext) || imageExtensions.includes(ext) || spreadsheetExtensions.includes(ext) || pdfExtensions.includes(ext);
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

  // Save spreadsheet to file system
  const saveSpreadsheet = useCallback(async (filePath: string) => {
    try {
      // Check if this is a cloud file that needs to be uploaded and replaced
      const isCloudFile = filePath && (
        filePath.startsWith('Core/Cloud/') || 
        filePath.includes(path.join(os.homedir(), 'BCloud'))
      );
      
      if (isCloudFile) {
        try {
          // Find the corresponding cloud file in our cloudFiles array
          const fileName = path.basename(filePath);
          const cloudFile = cloudFiles.find(file => 
            file.file_name === fileName
          );
          
          if (cloudFile) {
            // Create a File object from the saved spreadsheet file
            const { banbury } = await import('@banbury/core');
            const fs = await import('fs/promises');
            
            const fileBuffer = await fs.readFile(filePath);
            const file = new File([fileBuffer], fileName, {
              type: filePath.toLowerCase().endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            
            // Delete the existing cloud file first
            if (cloudFile._id || cloudFile.id) {
              try {
                const fileId = String(cloudFile._id || cloudFile.id);
                await banbury.files.deleteS3File(fileId);
              } catch (deleteError) {
                console.error('Error deleting existing cloud file:', deleteError);
                // Continue with upload even if delete fails - the upload should overwrite
              }
            }
            
            // Upload to S3/Cloud to replace the existing file
            const deviceName = devices && devices.length > 0 ? devices[0].device_name : '';
            if (!deviceName) {
              throw new Error('No device found. Please ensure you are logged in with a registered device.');
            }
            
            await banbury.files.uploadToS3(
              file,
              deviceName, // Use actual device name
              'Core/Cloud', // file path
              'Cloud' // file parent
            );
            
            // Delete the local BCloud file after successful upload
            await fs.unlink(filePath);
            
            showAlert('Success', [
              `"${fileName}" saved and uploaded to cloud successfully.`,
              'Local copy has been cleaned up.'
            ], 'success');
          } else {
            // No matching cloud file found, treat as regular save
            showAlert('Success', [`"${path.basename(filePath)}" saved successfully.`], 'success');
          }
        } catch (cloudError) {
          console.error('Error uploading spreadsheet to cloud or deleting local file:', cloudError);
          showAlert('Warning', [
            `"${path.basename(filePath)}" saved locally but failed to upload to cloud.`,
            `Error: ${cloudError instanceof Error ? cloudError.message : 'Unknown error'}`,
            'The file remains in your BCloud directory.'
          ], 'warning');
        }
      } else {
        // Regular local file save
        showAlert('Success', [`"${path.basename(filePath)}" saved successfully.`], 'success');
      }
    } catch (error) {
      console.error('Error saving spreadsheet:', error);
      showAlert('Error', [`Failed to save "${path.basename(filePath)}": ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
    }
  }, [showAlert, cloudFiles, devices]);

  // Save document to file system


  const saveDocument = useCallback(async (document: { fileName: string; filePath: string; content: string }) => {
    try {

      
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

          
          // Enhanced HTML parser that preserves formatting
          const htmlToDocxParagraphs = (htmlContent: string) => {
            const paragraphs: Paragraph[] = [];
            
            // Parse HTML and preserve basic formatting
            const parseElement = (element: string): TextRun[] => {
              const runs: TextRun[] = [];
              
              try {
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
                
                // Handle line breaks
                text = text.replace(/<br\s*\/?>/g, '\n');
                
                // Clean up remaining HTML
                text = text
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/&nbsp;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#039;/g, "'")
                  .replace(/&#x27;/g, "'")
                  .replace(/&#x2F;/g, "/")
                  .replace(/\s+/g, ' ')
                  .trim();
                
                // Split by newlines and create separate runs
                const lines = text.split('\n');
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i].trim();
                  if (line) {
                    runs.push(new TextRun({
                      text: line,
                      bold: isBold,
                      italics: isItalic,
                      underline: isUnderline ? {} : undefined,
                      strike: isStrike,
                    }));
                  }
                  // Add break between lines except for the last one
                  if (i < lines.length - 1) {
                    runs.push(new TextRun({
                      text: '',
                      break: 1
                    }));
                  }
                }
              } catch (error) {
                console.error('Error parsing element:', error);
                // Fallback: create a simple text run
                const plainText = element.replace(/<[^>]+>/g, '').trim();
                if (plainText) {
                  runs.push(new TextRun(plainText));
                }
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
          

          
          // Check if this is a cloud file that needs to be uploaded and replaced
          const isCloudFile = document.filePath && (
            document.filePath.startsWith('Core/Cloud/') || 
            document.filePath.includes(path.join(os.homedir(), 'BCloud'))
          );
          
          if (isCloudFile) {
            try {

              
              // Find the corresponding cloud file in our cloudFiles array
              const fileName = path.basename(document.filePath);
              const cloudFile = cloudFiles.find(file => 
                file.file_name === fileName || file.file_name === document.fileName
              );
              
              if (cloudFile) {
                // Create a File object from the saved DOCX file
                const { banbury } = await import('@banbury/core');
                const fs = await import('fs/promises');
                
                const fileBuffer = await fs.readFile(document.filePath);
                const file = new File([fileBuffer], fileName, {
                  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                });
                
                // Delete the existing cloud file first
                if (cloudFile._id || cloudFile.id) {
                                      try {
                      
                      const fileId = String(cloudFile._id || cloudFile.id);
                      await banbury.files.deleteS3File(fileId);
                  } catch (deleteError) {
                    console.error('Error deleting existing cloud file:', deleteError);
                    // Continue with upload even if delete fails - the upload should overwrite
                  }
                }
                
                // Upload to S3/Cloud to replace the existing file
                const deviceName = devices && devices.length > 0 ? devices[0].device_name : '';
                if (!deviceName) {
                  throw new Error('No device found. Please ensure you are logged in with a registered device.');
                }
                
                await banbury.files.uploadToS3(
                  file,
                  deviceName, // Use actual device name
                  'Core/Cloud', // file path
                  'Cloud' // file parent
                );
                
                
                
                // Delete the local BCloud file after successful upload
                await fs.unlink(document.filePath);
                
                
                showAlert('Success', [
                  `"${fileName}" saved and uploaded to cloud successfully in DOCX format.`,
                  'Local copy has been cleaned up.'
                ], 'success');
              } else {
                // No matching cloud file found, treat as regular save
                showAlert('Success', [`"${document.fileName}" saved successfully in DOCX format.`], 'success');
              }
            } catch (cloudError) {
              console.error('Error uploading DOCX to cloud or deleting local file:', cloudError);
              showAlert('Warning', [
                `"${document.fileName}" saved locally in DOCX format but failed to upload to cloud.`,
                `Error: ${cloudError instanceof Error ? cloudError.message : 'Unknown error'}`,
                'The file remains in your BCloud directory.'
              ], 'warning');
            }
          } else {
            // Regular local file save
            showAlert('Success', [`"${document.fileName}" saved successfully in DOCX format.`], 'success');
          }
          
          return; // Early return to avoid the generic success message
        } catch (docxError) {
          console.error('Error converting to DOCX:', docxError);
          
          // Do NOT fallback to HTML - show error instead
          showAlert('Error', [
            `Failed to save "${document.fileName}" as DOCX format.`,
            `Error: ${docxError instanceof Error ? docxError.message : 'Unknown error'}`,
            'Please try saving again or check the document content for unsupported formatting.'
          ], 'error');
          
          throw docxError; // Re-throw to prevent any further processing
        }
      } else {
        // For other formats, save as plain text
        textContent = htmlToText(document.content, false);
      }

      await writeFile(actualSavePath, textContent, 'utf-8');
      
      
      // Check if this is a cloud file that needs to be uploaded and replaced
      const isCloudFile = document.filePath && (
        document.filePath.startsWith('Core/Cloud/') || 
        actualSavePath.includes(path.join(os.homedir(), 'BCloud'))
      );
      
      if (isCloudFile) {
        try {
          
          
          // Find the corresponding cloud file in our cloudFiles array
          const fileName = path.basename(actualSavePath);
          const cloudFile = cloudFiles.find(file => 
            file.file_name === fileName || file.file_name === document.fileName
          );
          
          if (cloudFile) {
            // Create a File object from the saved file
            const { banbury } = await import('@banbury/core');
            const fs = await import('fs/promises');
            
            const fileBuffer = await fs.readFile(actualSavePath);
            const file = new File([fileBuffer], fileName, {
              type: 'application/octet-stream' // Generic type, the server will handle it
            });
            
            // Delete the existing cloud file first
            if (cloudFile._id || cloudFile.id) {
              try {
                
                                  const fileId = String(cloudFile._id || cloudFile.id);
                  await banbury.files.deleteS3File(fileId);
              } catch (deleteError) {
                console.error('Error deleting existing cloud file:', deleteError);
                // Continue with upload even if delete fails - the upload should overwrite
              }
            }
            
            // Upload to S3/Cloud to replace the existing file
            const deviceName = devices && devices.length > 0 ? devices[0].device_name : '';
            if (!deviceName) {
              throw new Error('No device found. Please ensure you are logged in with a registered device.');
            }
            
            await banbury.files.uploadToS3(
              file,
              deviceName, // Use actual device name
              'Core/Cloud', // file path
              'Cloud' // file parent
            );
            
            
            
            // Delete the local BCloud file after successful upload
            await fs.unlink(actualSavePath);
            
            
            showAlert('Success', [
              `"${fileName}" saved and uploaded to cloud successfully.`,
              'Local copy has been cleaned up.'
            ], 'success');
          } else {
            // No matching cloud file found, treat as regular save
            showAlert('Success', [`"${path.basename(actualSavePath)}" saved successfully.`], 'success');
          }
        } catch (cloudError) {
          console.error('Error uploading to cloud or deleting local file:', cloudError);
          showAlert('Warning', [
            `"${document.fileName}" saved locally but failed to upload to cloud.`,
            `Error: ${cloudError instanceof Error ? cloudError.message : 'Unknown error'}`,
            'The file remains in your BCloud directory.'
          ], 'warning');
        }
      } else {
        // Regular local file save
        showAlert('Success', [`"${path.basename(actualSavePath)}" saved successfully.`], 'success');
      }
    } catch (error) {
      console.error('Error saving document:', error);
      showAlert('Error', [`Failed to save "${document.fileName}": ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
    }
  }, [showAlert, cloudFiles, devices]);

  // Handle tab operations
  const handleCloseTab = useCallback((tabId: string) => {
    setOpenTabs(prev => {
      const tabToClose = prev.find(tab => tab.id === tabId);
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      // Clear image context if closing an image tab
      if (tabToClose && isImageFile(tabToClose.fileName) && activeTab === tabId) {
        setCurrentImageInfo(null);
      }
      
      // Clear PDF context if closing a PDF tab
      if (tabToClose && isPdfFile(tabToClose.fileName) && activeTab === tabId) {
        setCurrentPdfInfo(null);
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
          try {
            // Convert Node.js Buffer to ArrayBuffer for mammoth
            const arrayBuffer = new ArrayBuffer(buffer.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < buffer.length; i++) {
              view[i] = buffer[i];
            }
            
            const result = await mammoth.convertToHtml({ arrayBuffer });
            content = result.value || '<p>Document appears to be empty.</p>';
            
            // Clean up any empty paragraphs that mammoth might generate
            content = content.replace(/<p>\s*<\/p>/g, '<p><br></p>');
          } catch (mammothError) {
            console.error('Error converting DOCX with mammoth:', mammothError);
            
            // Try alternative: use path-based conversion if available
            try {
              const result = await mammoth.convertToHtml({ path: filePath });
              content = result.value || '<p>Document appears to be empty.</p>';
            } catch (pathError) {
              console.error('Error using path-based conversion:', pathError);
              
              // If both methods fail, try reading as text
              const fileText = buffer.toString('utf-8');
              if (fileText.trim().startsWith('<') && fileText.includes('>')) {
                content = fileText;
              } else {
                // Show error message in the editor
                content = `<p><strong>Error loading DOCX file:</strong></p>
                          <p>${mammothError instanceof Error ? mammothError.message : 'Unknown error'}</p>
                          <p><em>The file may be corrupted or in an unsupported format. Try saving the file again.</em></p>`;
              }
            }
          }
        }
      } else if (ext === '.html' || ext === '.htm') {
        // Handle HTML files directly
        content = await readFile(filePath, 'utf-8');
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
      
      // Validate content before setting state
      if (typeof content !== 'string') {
        throw new Error('Invalid document content');
      }
      
      setCurrentDocument({
        fileName,
        filePath,
        content
      });
      setCurrentDocumentContent(content);
      setShowTipTapEditor(true);
    } catch (error) {
      console.error('Error opening document:', error);
      showAlert('Error', [`Failed to open "${fileName}": ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
      
      // Reset state on error
      setCurrentDocument(null);
      setCurrentDocumentContent('');
      setShowTipTapEditor(false);
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

      // For PDF files, set PDF context (but don't load content as PDFs are read-only)
      if (isPdfFile(fileName)) {
        try {
          // Get file size
          const fs = await import('fs/promises');
          const stats = await fs.stat(filePath);
          
          setCurrentPdfInfo({
            fileName,
            filePath,
            fileType,
            fileSize: stats.size
          });
        } catch (error) {
          console.error('Error setting PDF context:', error);
        }
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

    
    // Normalize the path for cross-platform compatibility
    const normalizedPath = path.normalize(filePath);

    
    if (shouldOpenInMiddlePanel(fileName)) {
      // Open file in middle panel (editor or viewer)
      
      try {
        await openFileInMiddlePanel(fileName, normalizedPath, fileType);
      } catch (error) {
        console.error('Failed to open file in middle panel:', error);
        showAlert('Error', [`Failed to open "${fileName}": ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
      }
    } else {
      // Open other files with system default application
      
      try {
        await shell.openPath(normalizedPath);
      } catch (error) {
        console.error('Failed to open file with system app:', error);
        showAlert('Error', [`Failed to open "${fileName}" with system application.`], 'error');
      }
    }
  }, [showAlert, openFileInMiddlePanel]);



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

  const onAllotmentChange = useCallback(([leftWidth, , rightWidth]: number[]) => {
    const newLeftCollapsed = leftWidth === undefined || leftWidth === 0;
    const newRightOpen = rightWidth !== undefined && rightWidth > 0;
    
    updatePanelStates(newLeftCollapsed, newRightOpen);
  }, [updatePanelStates]);

  // Cloud files refresh function
  const refreshCloudFiles = useCallback(async () => {
    if (!username) return;

    try {
      const { fetchCloudData } = await import('../Files/utils/fetchAllData');
      const result = await fetchCloudData();
      setCloudFiles(result);
    } catch (error: any) {
      console.error('Error fetching Cloud files for Workspaces:', error);
      setCloudFiles([]);
    }
  }, [username]);

  // Add Cloud Files fetching effect (similar to Files.tsx)
  useEffect(() => {
    if (username) {
      refreshCloudFiles();
    }
  }, [username]); // Only depend on username, not refreshCloudFiles to prevent unnecessary re-renders

  // Rename file function
  const renameFile = useCallback(async (oldFileName: string, newFileName: string) => {
    try {
      if (!username || !devices || devices.length === 0) {
        showAlert('Error', ['Please ensure you are logged in with a registered device.'], 'error');
        return;
      }

      // Find the cloud file by name
      const cloudFile = cloudFiles.find(file => file.file_name === oldFileName);
      
      if (!cloudFile || !cloudFile.is_s3) {
        showAlert('Error', ['File not found in cloud storage or not a cloud file.'], 'error');
        return;
      }

      // Create a task for the rename operation
      const taskDescription = `Renaming "${oldFileName}" to "${newFileName}"`;
      let taskInfo: any = null;
      
      try {
        // Import required functions
        const { banbury: coreImport } = await import('@banbury/core');
        
        taskInfo = await coreImport.sessions.addTask(taskDescription, tasks || [], setTasks);
        setTaskbox_expanded(true);
        
        // Download the current file content
        const localFilePath = await coreImport.files.saveS3FileToBCloud(
          String(cloudFile._id || cloudFile.id),
          oldFileName
        );

        // Read the file content
        const fs = await import('fs/promises');
        const fileBuffer = await fs.readFile(localFilePath);

        // Create a new File object with the new name
        const file = new File([fileBuffer], newFileName, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        // Delete the old file from cloud
        await coreImport.files.deleteS3File(String(cloudFile._id || cloudFile.id));

        // Upload the file with the new name
        const deviceName = devices[0].device_name;
        await coreImport.files.uploadToS3(
          file,
          deviceName,
          'Core/Cloud',
          'Cloud'
        );

        // Clean up temporary files
        await fs.unlink(localFilePath);

        // Update the tab name if this file is currently open
        setOpenTabs(prev => prev.map(tab => 
          tab.fileName === oldFileName 
            ? { ...tab, fileName: newFileName }
            : tab
        ));

        // Refresh cloud files to reflect the change
        await refreshCloudFiles();

        // Complete the task
        await coreImport.sessions.completeTask(taskInfo, tasks || [], setTasks);

        showAlert('Success', [
          `File renamed from "${oldFileName}" to "${newFileName}" successfully.`
        ], 'success');

      } catch (error) {
        console.error('Error renaming file:', error);
        
        // Fail the task if it was created
        if (taskInfo) {
          const { banbury: coreImport } = await import('@banbury/core');
          await coreImport.sessions.failTask(
            taskInfo, 
            error instanceof Error ? error.message : 'Unknown error', 
            tasks || [], 
            setTasks
          );
        }

        showAlert('Error', [
          `Failed to rename file.`,
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        ], 'error');
      }

    } catch (error) {
      console.error('Error during rename operation:', error);
      showAlert('Error', [
        `Failed to rename file.`,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      ], 'error');
    }
  }, [username, devices, cloudFiles, tasks, setTasks, setTaskbox_expanded, showAlert, refreshCloudFiles]);

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
        top: 35,
        left: 40, // Add left padding to avoid overlapping with navigation sidebar
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        border: 1,
        borderColor: 'divider'
      }}>
      {/* Toolbar */}
      <Card variant="outlined" sx={{ 
        borderTop: 0, 
        borderLeft: 0, 
        borderBottom: 1, 
        borderColor: 'divider',
        borderStyle: 'solid'
      }}>
        <FilesToolbar
          _backHistory={_backHistory}
          setBackHistory={setBackHistory}
          _forwardHistory={_forwardHistory}
          setForwardHistory={setForwardHistory}
          filePath={filePath}
          setFilePath={setFilePath}
          setTaskbox_expanded={setTaskbox_expanded}
          selectedFileNames={selectedFileNames}
          selectedFileInfo={_selectedFileInfo}
          selectedDeviceNames={selectedDeviceNames}
          setSelectedFileNames={setSelectedFileNames}
          setSelected={() => {}}
          tasks={tasks}
          setTasks={setTasks}
          websocket={websocket as WebSocket}
          updates={Date.now()} // Use current timestamp as updates
          setUpdates={() => {}} // No-op function since we don't have updates state
          isShared={false}
          isCloudSync={false}
          handleFinish={handleFinish}
          handleShareModalOpen={handleShareModalOpen}
          getColumnOptions={getColumnOptions}
          columnVisibility={columnVisibility}
          handleColumnVisibilityChange={handleColumnVisibilityChange}
          viewType={viewType}
          setViewType={setViewType}
          username={username}
          onFileCreated={(fileName: string, filePath: string) => {
            // Open the newly created document in the middle panel
            openFileInMiddlePanel(fileName, filePath, 'Word Document');
          }}
          onRefreshFiles={refreshCloudFiles}
        />
      </Card>
      
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
              <Box sx={{ 
                height: '100%', 
                borderRight: 1, 
                borderColor: 'divider', 
                borderStyle: 'solid',
                position: 'relative', 
                display: 'flex', 
                flexDirection: 'column' 
              }}>
                <WorkspaceSidebar 
                  onFileClick={handleFileClick}
                  cloudFiles={cloudFiles}
                  cloudEnabled={cloudEnabled}
                  filePath={filePath}
                  setFilePath={setFilePath}
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
              <Box sx={{ 
                height: '100%', 
                borderRight: rightPanelOpen ? 1 : 0, 
                borderColor: 'divider',
                borderStyle: 'solid'
              }}>
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
                        onSaveSpreadsheet={saveSpreadsheet}
                        getCurrentContent={() => {
                          const activeTabData = openTabs.find(tab => tab.id === activeTab);
                          return activeTabData?.content || currentDocumentContent;
                        }}
                        setDocumentEditor={setDocumentEditor}
                        onRenameFile={renameFile}
                        spreadsheetEditorRef={spreadsheetEditorRef}
                        documentEditorRef={documentEditorRef}
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
                <WorkspaceAssistantInterface documentActions={documentActions} imageActions={imageActions} pdfActions={pdfActions} />
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