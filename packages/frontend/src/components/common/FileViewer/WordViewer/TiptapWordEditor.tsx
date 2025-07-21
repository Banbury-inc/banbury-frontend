import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Box,
  Paper,
  Toolbar,
  IconButton,
  Typography,
  Divider,
  Button,
  Alert,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  Save,
  Undo,
  Redo,
  GetApp,
} from '@mui/icons-material';
import { readFile, writeFile, stat } from 'fs/promises';
import path from 'path';
import { shell } from 'electron';
import mammoth from 'mammoth';

interface TiptapWordEditorProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
  onSave?: (content: string) => void;
}

const TiptapWordEditor: React.FC<TiptapWordEditorProps> = ({
  src,
  fileName,
  onError,
  onLoad,
  onSave,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
    ],
    content: '',
    editable: true,
    editorProps: {
      attributes: {
        class: 'tiptap-word-editor-content',
      },
    },
    onUpdate: ({ editor }) => {
      try {
        // Auto-save could be implemented here
        // For now, just ensure any future async operations are wrapped
      } catch (error) {
        console.error('Error in editor onUpdate:', error);
      }
    },
  });

  // Load DOCX file content
  useEffect(() => {
    const loadDocxContent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let filePath = src;
        
        // Remove file:// protocol if present
        if (filePath.startsWith('file://')) {
          filePath = filePath.replace('file://', '');
        }
        
        // Debug logging
        console.log('Loading DOCX file:', { originalSrc: src, processedPath: filePath });
        
        // Check if file exists first
        try {
          const stats = await stat(filePath);
          console.log('File stats:', { 
            exists: true, 
            size: stats.size, 
            isFile: stats.isFile() 
          });
        } catch (statError) {
          console.error('File does not exist or cannot be accessed:', filePath, statError);
          throw new Error(`File not found: ${filePath}`);
        }

        // Use mammoth to convert DOCX to HTML
        // Try multiple approaches for better compatibility
        let result;
        let conversionMethod = 'unknown';
        
        try {
          // Method 1: Try with buffer (most reliable in Electron)
          console.log('Attempting buffer method...');
          const buffer = await readFile(filePath);
          console.log('File buffer loaded, size:', buffer.length);
          
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
            const buffer = await readFile(filePath);
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
        
        if (editor) {
          // Set content as HTML - wrap in try-catch to handle any errors
          try {
            editor.commands.setContent(result.value || '<p>Start editing this document...</p>');
          } catch (contentError) {
            console.error('Error setting editor content:', contentError);
            setError('Failed to set document content in editor.');
          }
        }
        
        onLoad?.();
      } catch (err) {
        console.error('Error loading DOCX file:', err);
        setError(`Failed to load document: ${err instanceof Error ? err.message : 'Unable to parse DOCX file'}`);
        
        if (editor) {
          try {
            editor.commands.setContent(`
              <div>
                <h2>Document: ${fileName}</h2>
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 4px; margin: 16px 0;">
                  <p style="margin: 0; color: #856404;"><strong>Unable to load DOCX content</strong></p>
                  <p style="margin: 8px 0 0 0; color: #856404; font-size: 14px;">
                    The document format may not be supported or the file may be corrupted. 
                    You can start editing with rich text formatting below, or try opening the original file with your system's default application.
                  </p>
                </div>
                <p>Start typing your content here...</p>
              </div>
            `);
          } catch (fallbackContentError) {
            console.error('Error setting fallback editor content:', fallbackContentError);
          }
        }
        
        onError?.();
      } finally {
        setIsLoading(false);
      }
    };

    if (editor) {
      // Wrap the async function call to prevent unhandled promise rejections
      loadDocxContent().catch((error) => {
        console.error('Unhandled error in loadDocxContent:', error);
        setError('Failed to load document due to an unexpected error.');
        setIsLoading(false);
      });
    }
  }, [editor, src, fileName, onLoad, onError]);

  const handleSave = async () => {
    if (!editor) return;

    try {
      setIsSaving(true);
      setError(null); // Clear any previous errors
      const content = editor.getHTML();
      
      // For now, save as HTML alongside the original DOCX
      let filePath = src;
      if (filePath.startsWith('file://')) {
        filePath = filePath.replace('file://', '');
      }
      
      const htmlFilePath = filePath.replace('.docx', '_edited.html');
      await writeFile(htmlFilePath, content, 'utf-8');
      
      if (onSave) {
        onSave(content);
      }

      console.log('Document saved successfully as HTML');
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Failed to save document. Please check file permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenWithSystemApp = () => {
    let filePath = src;
    if (filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }
    shell.openPath(filePath);
  };

  if (!editor) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading editor...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Editor Toolbar */}
      <Paper elevation={1} sx={{ borderRadius: 0 }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, gap: 1 }}>
          <Typography variant="subtitle2" sx={{ mr: 2, fontWeight: 600 }}>
            {fileName}
          </Typography>
          
          <Divider orientation="vertical" flexItem />
          
          {/* Format Buttons */}
          <IconButton
            size="small"
            onClick={() => {
              try {
                editor.chain().focus().toggleBold().run();
              } catch (error) {
                console.error('Error toggling bold:', error);
              }
            }}
            color={editor.isActive('bold') ? 'primary' : 'default'}
          >
            <FormatBold />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={() => {
              try {
                editor.chain().focus().toggleItalic().run();
              } catch (error) {
                console.error('Error toggling italic:', error);
              }
            }}
            color={editor.isActive('italic') ? 'primary' : 'default'}
          >
            <FormatItalic />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={() => {
              try {
                editor.chain().focus().toggleStrike().run();
              } catch (error) {
                console.error('Error toggling strike:', error);
              }
            }}
            color={editor.isActive('strike') ? 'primary' : 'default'}
          >
            <FormatUnderlined />
          </IconButton>

          <Divider orientation="vertical" flexItem />

          {/* List Buttons */}
          <IconButton
            size="small"
            onClick={() => {
              try {
                editor.chain().focus().toggleBulletList().run();
              } catch (error) {
                console.error('Error toggling bullet list:', error);
              }
            }}
            color={editor.isActive('bulletList') ? 'primary' : 'default'}
          >
            <FormatListBulleted />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={() => {
              try {
                editor.chain().focus().toggleOrderedList().run();
              } catch (error) {
                console.error('Error toggling ordered list:', error);
              }
            }}
            color={editor.isActive('orderedList') ? 'primary' : 'default'}
          >
            <FormatListNumbered />
          </IconButton>

          <Divider orientation="vertical" flexItem />

          {/* Undo/Redo */}
          <IconButton
            size="small"
            onClick={() => {
              try {
                editor.chain().focus().undo().run();
              } catch (error) {
                console.error('Error undoing:', error);
              }
            }}
            disabled={!editor.can().undo()}
          >
            <Undo />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={() => {
              try {
                editor.chain().focus().redo().run();
              } catch (error) {
                console.error('Error redoing:', error);
              }
            }}
            disabled={!editor.can().redo()}
          >
            <Redo />
          </IconButton>

          <Box sx={{ flex: 1 }} />

          {/* Action Buttons */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<GetApp />}
            onClick={handleOpenWithSystemApp}
          >
            Open Original
          </Button>
          
          <Button
            variant="contained"
            size="small"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save as HTML'}
          </Button>
        </Toolbar>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="warning" sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* Editor Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
        <Paper 
          elevation={2} 
          sx={{ 
            minHeight: '100%', 
            p: 3,
            bgcolor: 'white',
            maxWidth: '8.5in',
            margin: '0 auto',
            '& .tiptap-word-editor-content': {
              outline: 'none',
              minHeight: '400px',
              fontSize: '14px',
              lineHeight: 1.6,
              fontFamily: '"Times New Roman", serif',
              color: '#000000', // Set default text color to black
              '& p': {
                margin: '0 0 1em 0',
                color: '#000000', // Ensure paragraphs are black
              },
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                margin: '1.5em 0 0.5em 0',
                fontWeight: 600,
                color: '#000000', // Ensure headings are black
              },
              '& ul, & ol': {
                margin: '0 0 1em 0',
                paddingLeft: '1.2em',
                color: '#000000', // Ensure lists are black
              },
              '& li': {
                margin: '0.2em 0',
                color: '#000000', // Ensure list items are black
              },
              '& div': {
                color: '#000000', // Ensure divs are black
              },
              '& span': {
                color: 'inherit', // Spans inherit from parent
              },
            }
          }}
        >
          {isLoading ? (
            <Typography color="text.secondary">Loading document...</Typography>
          ) : (
            <EditorContent editor={editor} />
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default TiptapWordEditor; 