import React, { useState, useCallback, Suspense, useMemo } from 'react';
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
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { Allotment, LayoutPriority } from 'allotment';
import { AnimatePresence, motion } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAuth } from '../../../renderer/context/AuthContext';
import { useAlert } from '../../../renderer/context/AlertContext';
import FileTreeView from '../Files/components/NewTreeView/FileTreeView';
import FileViewerTabs from '../../common/FileViewer/FileViewerTabs';
import WorkspaceAssistantInterface from './components/WorkspaceAssistantInterface';
import path from 'path';
import os from 'os';
import { stat } from 'fs/promises';
import { shell } from 'electron';
import 'allotment/dist/style.css';

// File tab interface
interface FileTab {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
}

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
    <IconButton
      onClick={onClick}
      size="small"
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        width: 24,
        height: 24,
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Typography sx={{ fontSize: '10px', fontWeight: 'bold' }}>
        {direction === 'left' 
          ? (isCollapsed ? '→' : '←')
          : (isCollapsed ? '←' : '→')
        }
      </Typography>
    </IconButton>
  </Box>
);

// Helper function to check if file can be viewed in app
const isViewableInApp = (fileName: string): boolean => {
  const ext = path.extname(fileName).toLowerCase();
  const viewableExtensions = [
    '.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.xml', '.yaml', '.yml',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.pdf', '.mp4', '.mov', '.avi', '.mp3', '.wav',
    '.doc', '.docx', '.xls', '.xlsx'
  ];
  return viewableExtensions.includes(ext);
};

// Workspace Sidebar Component
const WorkspaceSidebar = ({ 
  resetWorkspaceView,
  onFileClick 
}: { 
  resetWorkspaceView: () => void;
  onFileClick?: (fileName: string, filePath: string, fileType: string) => void;
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
        // Handle absolute paths (like C:\Users\... on Windows)
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
  }, [filePath, onFileClick]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          File Explorer
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Browse and manage your files
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
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
          />
        )}
      </Box>
    </Box>
  );
};

// Main Content Component
const MainContent = ({
  showFileViewer,
  openTabs,
  activeTab,
  onCloseTab,
  onSwitchTab,
  documentActions,
  onDocumentEditorChange,
}: {
  showFileViewer: boolean;
  openTabs: FileTab[];
  activeTab: string | null;
  onCloseTab: (tabId: string) => void;
  onSwitchTab: (tabId: string) => void;
  documentActions: any;
  onDocumentEditorChange: (editor: any, content: string, fileName: string) => void;
}) => {
  if (showFileViewer && openTabs.length > 0) {
    return (
      <FileViewerTabs
        openTabs={openTabs}
        activeTab={activeTab}
        onCloseTab={onCloseTab}
        onSwitchTab={onSwitchTab}
        documentActions={documentActions}
        onDocumentEditorChange={onDocumentEditorChange}
      />
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      p: 4
    }}>
      <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Welcome to Workspaces
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Use the file explorer on the left to browse and open files. 
          Enable the AI assistant on the right to get help with your code and projects.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select any file from the tree to view it here.
        </Typography>
      </Box>
    </Box>
  );
};

// Main Workspaces Component
export default function Workspaces() {
  // Panel state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // File viewer state
  const [openTabs, setOpenTabs] = useState<FileTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);

  // Document editing context for AI assistant
  const [documentEditor, setDocumentEditor] = useState<any>(null);
  const [currentDocumentContent, setCurrentDocumentContent] = useState<string>('');
  const [currentDocumentName, setCurrentDocumentName] = useState<string>('');

  const { showAlert } = useAlert();
  const { username, tasks, setTasks, setTaskbox_expanded } = useAuth();

  // Document AI Integration Functions
  const getDocumentInfo = useCallback(() => {
    const activeTabData = openTabs.find(tab => tab.id === activeTab);
    return {
      hasDocument: Boolean(documentEditor && activeTabData),
      fileName: currentDocumentName || activeTabData?.fileName || '',
      fileType: activeTabData?.fileType || '',
      filePath: activeTabData?.filePath || '',
      isWordDocument: activeTabData?.fileType === 'Word Document',
      content: currentDocumentContent
    };
  }, [documentEditor, activeTab, openTabs, currentDocumentName, currentDocumentContent]);

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

  // Keyboard shortcuts
  useHotkeys('ctrl+/', () => toggleRightPanel(), { preventDefault: true });
  useHotkeys('meta+/', () => toggleRightPanel(), { preventDefault: true });
  useHotkeys('ctrl+alt+/', () => toggleLeftPanel(), { preventDefault: true });
  useHotkeys('meta+alt+/', () => toggleLeftPanel(), { preventDefault: true });

  const closeTab = useCallback((tabId: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      if (newTabs.length === 0) {
        setShowFileViewer(false);
        setActiveTab(null);
      } else if (activeTab === tabId) {
        setActiveTab(newTabs[newTabs.length - 1].id);
      }
      return newTabs;
    });
  }, [activeTab]);

  const switchTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  const resetWorkspaceView = () => {
    setShowFileViewer(false);
    setOpenTabs([]);
    setActiveTab(null);
  };

  // File handling functions
  const openFileInTab = useCallback(async (fileName: string, filePath: string, fileType: string) => {
    // Check if file exists and is accessible
    try {
      await stat(filePath);
    } catch (error) {
      console.log('File not found locally:', filePath);
      showAlert('File not available', [`The file "${fileName}" is not available locally. Please ensure it's synced to this device.`], 'warning');
      return;
    }

    const tabId = `${filePath}_${Date.now()}`;
    const newTab: FileTab = {
      id: tabId,
      fileName,
      filePath: path.normalize(filePath), // Normalize for cross-platform compatibility
      fileType
    };
    
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTab(tabId);
    setShowFileViewer(true);
  }, [showAlert]);

  const handleFileClick = useCallback(async (fileName: string, filePath: string, fileType: string) => {
    console.log('File clicked:', fileName, filePath, fileType);
    
    // Normalize the path for cross-platform compatibility
    const normalizedPath = path.normalize(filePath);
    
    if (isViewableInApp(fileName)) {
      openFileInTab(fileName, normalizedPath, fileType);
    } else {
      // For non-viewable files, open with system default application
      try {
        await shell.openPath(normalizedPath);
      } catch (error) {
        console.error('Failed to open file with system app:', error);
        showAlert('Error', [`Failed to open "${fileName}" with system application.`], 'error');
      }
    }
  }, [openFileInTab, showAlert]);

  const toggleLeftPanel = () => {
    setLeftPanelCollapsed(!leftPanelCollapsed);
  };

  const toggleRightPanel = () => {
    setRightPanelOpen(!rightPanelOpen);
  };

  const onAllotmentChange = useCallback(([leftWidth, middleWidth, rightWidth]: number[]) => {
    if (rightWidth !== undefined) {
      setRightPanelOpen(rightWidth > 0);
    }
    if (leftWidth !== undefined) {
      setLeftPanelCollapsed(leftWidth === 0);
    }
  }, []);

  return (
    <Box sx={{ 
      position: 'fixed',
      top: 40,
      left: 80, // Add left padding to avoid overlapping with navigation sidebar
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default'
    }}>
      {/* Header */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        zIndex: 1000
      }}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
                Workspaces
              </Typography>
              {showFileViewer && openTabs.length > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary">/</Typography>
                  <Typography variant="body1" color="text.secondary">
                    {openTabs.find(tab => tab.id === activeTab)?.fileName || 'File Viewer'}
                  </Typography>
                </>
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              {rightPanelOpen ? (
                <Button
                  variant="outlined"
                  startIcon={<CloseIcon />}
                  onClick={() => setRightPanelOpen(false)}
                  size="small"
                >
                  Close Assistant
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<SmartToyIcon />}
                  onClick={() => setRightPanelOpen(true)}
                  size="small"
                >
                  Open AI Assistant
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Main Content - Three Panel Layout */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
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
              <Box sx={{ height: '100%', position: 'relative', borderRight: 1, borderColor: 'divider' }}>
                <WorkspaceSidebar 
                  resetWorkspaceView={resetWorkspaceView} 
                  onFileClick={handleFileClick}
                />
                <NavToggleButton
                  isCollapsed={leftPanelCollapsed}
                  onClick={toggleLeftPanel}
                  direction="left"
                />
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
                    <MainContent
                      showFileViewer={showFileViewer}
                      openTabs={openTabs}
                      activeTab={activeTab}
                      onCloseTab={closeTab}
                      onSwitchTab={switchTab}
                      documentActions={documentActions}
                      onDocumentEditorChange={(editor, content, fileName) => {
                        setDocumentEditor(editor);
                        setCurrentDocumentContent(content);
                        setCurrentDocumentName(fileName);
                      }}
                    />
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
                <WorkspaceAssistantInterface documentActions={documentActions} />
                <NavToggleButton
                  isCollapsed={!rightPanelOpen}
                  onClick={toggleRightPanel}
                  direction="right"
                />
              </Box>
            </Allotment.Pane>
          </Allotment>
        </Suspense>
      </Box>
    </Box>
  );
} 