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
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';
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
  onSaveDocument,
  getCurrentContent,
  setDocumentEditor
}: { 
  showEditor: boolean;
  document: { fileName: string; filePath: string; content: string } | null;
  onDocumentChange: (content: string) => void;
  onCloseDocument: () => void;
  onSaveDocument: (document: { fileName: string; filePath: string; content: string }) => void;
  getCurrentContent: () => string;
  setDocumentEditor: (editor: any) => void;
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
              // Use the current content from state instead of the original document content
              const currentContent = getCurrentContent();
              onSaveDocument({
                ...document,
                content: currentContent
              });
            }}
            onEditorReady={(editor) => {
              // Set the editor instance for AI integration
              setDocumentEditor(editor);
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
        // For Word documents, first check if it's actually a DOCX file or plain text
        try {
          console.log('Loading DOCX content using mammoth.js...');
          const buffer = await readFile(filePath);
          console.log('File buffer loaded, size:', buffer.length);
          
          // Check if the file is actually a DOCX file (starts with PK signature) or plain text
          const isActualDocx = buffer.length > 4 && 
            buffer[0] === 0x50 && buffer[1] === 0x4B && // PK signature
            (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07); // Various zip types
          
          if (!isActualDocx) {
            // This is likely a plain text file that was saved with .docx extension
            // Treat it as a text file
            console.log('File appears to be plain text despite .docx extension, treating as text');
            const fileText = buffer.toString('utf-8');
            if (!fileText || fileText.trim().length === 0) {
              content = '<p><em>This file appears to be empty.</em></p>';
            } else {
              try {
                // Try to parse as HTML first (in case it was saved as HTML)
                if (fileText.trim().startsWith('<') && fileText.includes('>')) {
                  content = fileText;
                  console.log('File appears to contain HTML content');
                } else {
                  // Convert plain text to HTML
                  content = textToHtml(fileText);
                  console.log('Converted plain text to HTML');
                }
              } catch (conversionError) {
                console.error('Error converting text to HTML:', conversionError);
                content = `<p>${fileText.replace(/\n/g, '<br>')}</p>`;
              }
            }
          } else {
            // This is an actual DOCX file, use mammoth to parse it
            let result;
            let conversionMethod = 'unknown';
            
            try {
              // Method 1: Try with buffer (most reliable in Electron)
              console.log('Attempting buffer method...');
              
              // Ensure buffer is in the right format for mammoth
              const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
              result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
              conversionMethod = 'arrayBuffer';
              console.log('Successfully converted using arrayBuffer method');
              
            } catch (arrayBufferError) {
              console.log('ArrayBuffer method failed:', arrayBufferError);
              
              try {
                // Method 2: Try with regular buffer
                console.log('Attempting regular buffer method...');
                result = await mammoth.convertToHtml({ buffer: buffer });
                conversionMethod = 'buffer';
                console.log('Successfully converted using buffer method');
                
              } catch (bufferError) {
                console.log('Buffer method failed:', bufferError);
                
                try {
                  // Method 3: Try with path (if supported)
                  console.log('Attempting path method...');
                  result = await mammoth.convertToHtml({ path: filePath });
                  conversionMethod = 'path';
                  console.log('Successfully converted using path method');
                  
                } catch (pathError) {
                  console.error('All mammoth methods failed:', {
                    arrayBufferError,
                    bufferError,
                    pathError
                  });
                  throw new Error(`Unable to parse DOCX file using any method. Last error: ${pathError instanceof Error ? pathError.message : String(pathError)}`);
                }
              }
            }
            
            console.log(`DOCX conversion successful using method: ${conversionMethod}`);
            
            // Use the converted HTML content
            content = result.value || '<p>Document appears to be empty.</p>';
            
            // Clean up the content if needed (mammoth sometimes produces extra elements)
            if (content.trim() === '') {
              content = '<p>Document appears to be empty.</p>';
            }
            
            console.log('DOCX content loaded successfully, length:', content.length);
          }
          
        } catch (docxError) {
          console.error('Error loading DOCX content:', docxError);
          content = `<h1>Error Loading Document</h1><p>Could not load the contents of "${fileName}".</p><p>Error: ${docxError instanceof Error ? docxError.message : 'Unknown error parsing DOCX file'}</p>`;
        }
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
            try {
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
            } catch (conversionError) {
              console.error('Error converting text to HTML:', conversionError);
              // Fallback to plain text wrapped in a paragraph
              content = `<p>${fileText.replace(/\n/g, '<br>')}</p>`;
            }
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
      try {
        await openInTipTap(fileName, normalizedPath);
      } catch (error) {
        console.error('Failed to open file in TipTap:', error);
        showAlert('Error', [`Failed to open "${fileName}" in editor: ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
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
                        setDocumentEditor(null); // Clear editor for AI integration
                      }}
                      onSaveDocument={saveDocument}
                      getCurrentContent={() => currentDocumentContent}
                      setDocumentEditor={setDocumentEditor}
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