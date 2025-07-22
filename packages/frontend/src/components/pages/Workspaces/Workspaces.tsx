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
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { Allotment, LayoutPriority } from 'allotment';
import { AnimatePresence, motion } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAuth } from '../../../renderer/context/AuthContext';
import { useAlert } from '../../../renderer/context/AlertContext';
import FileTreeView from '../Files/components/NewTreeView/FileTreeView';

import WorkspaceAssistantInterface from './components/WorkspaceAssistantInterface';
import SimpleTipTapEditor from './components/SimpleTipTapEditor';
import path from 'path';
import os from 'os';
import { stat, readFile, writeFile } from 'fs/promises';
import { shell } from 'electron';
import 'allotment/dist/style.css';



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
  );
};

// Main Content Component - Shows welcome screen or TipTap editor
const MainContent = ({ 
  showEditor, 
  document, 
  onDocumentChange,
  onCloseDocument,
  onSaveDocument
}: { 
  showEditor: boolean;
  document: { fileName: string; filePath: string; content: string } | null;
  onDocumentChange: (content: string) => void;
  onCloseDocument: () => void;
  onSaveDocument: (document: { fileName: string; filePath: string; content: string }) => void;
}) => {
  if (showEditor && document) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Document Header */}
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
            {document.fileName}
          </Typography>
          <IconButton onClick={onCloseDocument} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* TipTap Editor */}
        <Box sx={{ flex: 1 }}>
          <SimpleTipTapEditor
            content={document.content}
            onChange={onDocumentChange}
            placeholder={`Start editing ${document.fileName}...`}
            onSave={() => {
              onSaveDocument(document);
            }}
          />
        </Box>
      </Box>
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
      <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
          Welcome to Workspaces
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
          Browse your files in the left panel and open documents to edit them with our powerful rich text editor. 
          Use the AI assistant on the right to get help with your work.
        </Typography>
        <Box sx={{ 
          p: 3, 
          backgroundColor: 'grey.50', 
          borderRadius: 2, 
          border: 1, 
          borderColor: 'grey.200'
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
            💡 Quick Start:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Click on any .txt, .md, .docx, or document file in the file tree to edit it<br/>
            • Use Ctrl+S (or Cmd+S) to save your changes<br/>
            • Use the AI assistant to help with writing and coding<br/>
            • All other files will open in their default applications
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Main Workspaces Component
export default function Workspaces() {

  // Panel state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

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

  const { showAlert } = useAlert();
  const { username, tasks, setTasks, setTaskbox_expanded } = useAuth();

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

  // Determine if file should open in TipTap editor
  const shouldOpenInTipTap = (fileName: string): boolean => {
    const ext = path.extname(fileName).toLowerCase();
    const editableExtensions = ['.txt', '.md', '.markdown', '.rtf', '.doc', '.docx'];
    return editableExtensions.includes(ext);
  };

  // Convert plain text to HTML for TipTap
  const textToHtml = (text: string): string => {
    console.log('=== TEXT TO HTML CONVERSION ===');
    console.log('Input text:', text);
    console.log('Input text length:', text.length);
    
    if (!text || text.trim().length === 0) {
      console.log('Text is empty, returning default paragraph');
      return '<p></p>';
    }

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
        const heading = trimmed.substring(2).trim();
        html += `<h1>${heading}</h1>`;
        console.log(`Added H1: ${heading}`);
      } else if (trimmed.startsWith('## ')) {
        const heading = trimmed.substring(3).trim();
        html += `<h2>${heading}</h2>`;
        console.log(`Added H2: ${heading}`);
      } else if (trimmed.startsWith('### ')) {
        const heading = trimmed.substring(4).trim();
        html += `<h3>${heading}</h3>`;
        console.log(`Added H3: ${heading}`);
      } else {
        // Regular paragraph - preserve line breaks within paragraph
        const lines = trimmed.split('\n').map(line => line.trim()).filter(line => line);
        console.log(`Paragraph ${i} lines:`, lines);
        
        if (lines.length === 1) {
          html += `<p>${lines[0]}</p>`;
          console.log(`Added single line paragraph: ${lines[0]}`);
        } else if (lines.length > 1) {
          html += `<p>${lines.join('<br>')}</p>`;
          console.log(`Added multi-line paragraph with ${lines.length} lines`);
        }
      }
    }

    // If we still have no HTML content, create a paragraph with the raw text
    if (!html.trim()) {
      console.log('No HTML generated from paragraphs, using raw text');
      // Just wrap the entire text in a paragraph, replacing line breaks
      const cleanText = text.trim().replace(/\n/g, '<br>');
      html = `<p>${cleanText}</p>`;
    }

    console.log('Final HTML output:', html);
    console.log('=== END TEXT TO HTML CONVERSION ===');
    return html;
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

      if (ext === '.md' || ext === '.markdown') {
        // Save as markdown
        textContent = htmlToText(document.content, true);
      } else if (ext === '.txt' || ext === '.rtf') {
        // Save as plain text
        textContent = htmlToText(document.content, false);
      } else {
        // For other formats, save as plain text
        textContent = htmlToText(document.content, false);
      }

      await writeFile(document.filePath, textContent, 'utf-8');
      console.log('Document saved successfully:', document.fileName);
      showAlert('Success', [`"${document.fileName}" saved successfully.`], 'success');
    } catch (error) {
      console.error('Error saving document:', error);
      showAlert('Error', [`Failed to save "${document.fileName}": ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
    }
  }, [showAlert]);

  // Open document in TipTap editor
  const openInTipTap = useCallback(async (fileName: string, filePath: string) => {
    try {
      console.log('=== FILE LOADING DEBUG ===');
      console.log('Opening file in TipTap:', fileName);
      console.log('File path:', filePath);
      console.log('Normalized path:', path.normalize(filePath));
      
      // Check if file exists
      console.log('Checking if file exists...');
      const fileStats = await stat(filePath);
      console.log('File stats:', fileStats);
      
      if (!fileStats.isFile()) {
        throw new Error('Path is not a file');
      }

      let content = '';
      const ext = path.extname(fileName).toLowerCase();
      console.log('File extension:', ext);

      if (ext === '.docx' || ext === '.doc') {
        // For Word documents, show a placeholder for now
        // TODO: Implement proper Word document parsing
        content = `<h1>${fileName}</h1><p>Word document editing coming soon...</p><p>This is a placeholder for the actual document content.</p>`;
        console.log('Using Word document placeholder');
      } else {
        // For text files (.txt, .md, .markdown, .rtf)
        try {
          console.log('Reading file contents...');
          const fileBuffer = await readFile(filePath);
          console.log('File buffer size:', fileBuffer.length);
          
          const fileText = fileBuffer.toString('utf-8');
          console.log('File text length:', fileText.length);
          console.log('File text preview:', fileText.substring(0, 200));
          
          if (!fileText || fileText.trim().length === 0) {
            console.log('File appears to be empty');
            content = '<p><em>This file appears to be empty.</em></p>';
          } else {
            if (ext === '.md' || ext === '.markdown') {
              // For markdown files, convert basic markdown to HTML
              console.log('Converting markdown to HTML...');
              content = textToHtml(fileText);
            } else {
              // For plain text files, convert to HTML
              console.log('Converting text to HTML...');
              content = textToHtml(fileText);
            }
            console.log('Converted content preview:', content.substring(0, 200));
          }
        } catch (readError) {
          console.error('Error reading file:', readError);
          console.error('Error details:', readError);
          content = `<h1>Error Reading File</h1><p>Could not read the contents of "${fileName}".</p><p>Error: ${readError instanceof Error ? readError.message : 'Unknown error'}</p>`;
        }
      }

      console.log('Final content length:', content.length);
      console.log('Setting document state...');

      setCurrentDocument({
        fileName,
        filePath,
        content
      });
      setCurrentDocumentContent(content);
      setCurrentDocumentName(fileName);
      setShowTipTapEditor(true);
      
      console.log('File loaded successfully:', fileName);
      console.log('=== END FILE LOADING DEBUG ===');
    } catch (error) {
      console.error('Error opening document in TipTap:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      showAlert('Error', [`Failed to open "${fileName}" in editor: ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
    }
  }, [showAlert]);

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
    
    console.log('Should open in TipTap:', shouldOpenInTipTap(fileName));
    
    if (shouldOpenInTipTap(fileName)) {
      // Open document files in TipTap editor
      console.log('Opening in TipTap with path:', normalizedPath);
      openInTipTap(fileName, normalizedPath);
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
  }, [showAlert, openInTipTap]);

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
              {showTipTapEditor && currentDocument && (
                <>
                  <Typography variant="body2" color="text.secondary">/</Typography>
                  <Typography variant="body1" color="text.secondary">
                    {currentDocument.fileName}
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
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<SmartToyIcon />}
                  onClick={() => setRightPanelOpen(true)}
                  size="small"
                >
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
                      showEditor={showTipTapEditor}
                      document={currentDocument}
                      onDocumentChange={(content) => {
                        setCurrentDocumentContent(content);
                        if (currentDocument) {
                          setCurrentDocument({
                            ...currentDocument,
                            content
                          });
                        }
                      }}
                      onCloseDocument={() => {
                        setShowTipTapEditor(false);
                        setCurrentDocument(null);
                        setCurrentDocumentContent('');
                        setCurrentDocumentName('');
                      }}
                      onSaveDocument={saveDocument}
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