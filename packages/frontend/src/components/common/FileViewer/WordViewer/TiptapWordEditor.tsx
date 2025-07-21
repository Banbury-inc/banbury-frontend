import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Menu,
  MenuItem,
  Chip,
  CircularProgress,
  FormControl,
  Select,
  InputLabel,
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
  SmartToy,
  AutoFixHigh,
  Summarize,
  Translate,
  Edit,
  MoreVert,
} from '@mui/icons-material';
import { readFile, writeFile, stat } from 'fs/promises';
import path from 'path';
import { shell } from 'electron';
import mammoth from 'mammoth';
import { LangGraphAgent, ModelConfig } from '@banbury/core/src/ai/agent/LangGraphAgent';
import { useMcpClient } from '@banbury/core/src/ai/basic/tools/banburyMCP/useMcpClient';

interface TiptapWordEditorProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
  onSave?: (content: string) => void;
  documentActions?: any;
  onDocumentEditorChange?: (editor: any, content: string, fileName: string) => void;
}

// Available AI models
const availableModels = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
  { id: 'claude-4-opus-20250101', name: 'Claude 4 Opus', provider: 'anthropic' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet', provider: 'anthropic' },
  { id: 'claude-4-haiku-20250101', name: 'Claude 4 Haiku', provider: 'anthropic' },
  { id: 'llama3.1:8b', name: 'Llama 3.1 8B', provider: 'ollama' },
  { id: 'llama3.1:70b', name: 'Llama 3.1 70B', provider: 'ollama' },
  { id: 'codellama:13b', name: 'Code Llama 13B', provider: 'ollama' },
];

const TiptapWordEditor: React.FC<TiptapWordEditorProps> = ({
  src,
  fileName,
  onError,
  onLoad,
  onSave,
  documentActions,
  onDocumentEditorChange,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  
  // AI-related state
  const [aiAgent, setAiAgent] = useState<LangGraphAgent | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMenuAnchor, setAiMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('tiptap_ai_model') || 'claude-sonnet-4-20250514';
  });

  // AI model configuration
  const modelConfig: ModelConfig = useMemo(() => {
    const model = availableModels.find(m => m.id === selectedModel);
    const provider = model?.provider || 'anthropic';
    
    const config: ModelConfig = {
      provider: provider as 'anthropic' | 'ollama',
      temperature: 0.7
    };

    if (provider === 'anthropic') {
      config.anthropicApiKey = localStorage.getItem('ANTHROPIC_API_KEY') || '';
      config.anthropicModel = selectedModel;
    } else if (provider === 'ollama') {
      config.ollamaBaseUrl = localStorage.getItem('OLLAMA_BASE_URL') || 'http://localhost:11434';
      config.ollamaModel = selectedModel;
    }

    return config;
  }, [selectedModel]);

  // Initialize MCP client
  const { client: mcpClient } = useMcpClient();

  // Tool configuration for document assistance
  const toolConfig = useMemo(() => ({
    webSearch: true,
    banbury: true,
    filesystem: false,
    gmail: false,
    googleCalendar: false,
    googleDrive: false,
    googleTasks: false
  }), []);

  // Save selected model to localStorage
  useEffect(() => {
    localStorage.setItem('tiptap_ai_model', selectedModel);
  }, [selectedModel]);

  // Initialize AI Agent
  useEffect(() => {
    try {
      const agent = new LangGraphAgent(
        modelConfig,
        mcpClient,
        undefined, // Use default file system root
        toolConfig
      );
      setAiAgent(agent);
    } catch (error) {
      console.error('Error initializing AI agent for document editing:', error);
    }
  }, [modelConfig, mcpClient, toolConfig]);

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
    // Only load if we have an editor, a source file, and haven't already loaded this document
    if (!editor || !src || documentLoaded) return;

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
        
        // Mark document as loaded to prevent re-loading
        setDocumentLoaded(true);
        
        onLoad?.();
        
        // Register editor with parent component for AI assistant integration
        if (onDocumentEditorChange && editor) {
          const content = editor.getHTML ? editor.getHTML() : editor.getText();
          onDocumentEditorChange(editor, content, fileName || 'Untitled Document');
        }
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
        
        // Mark as loaded even if failed to prevent retry loops
        setDocumentLoaded(true);
        onError?.();
      } finally {
        setIsLoading(false);
      }
    };

    // Wrap the async function call to prevent unhandled promise rejections
    loadDocxContent().catch((error) => {
      console.error('Unhandled error in loadDocxContent:', error);
      setError('Failed to load document due to an unexpected error.');
      setIsLoading(false);
      setDocumentLoaded(true); // Prevent retry loops
    });
  }, [editor, src, documentLoaded]);

  // Reset document loaded state when src changes (new document)
  useEffect(() => {
    setDocumentLoaded(false);
  }, [src]);

  // Listen for editor content changes and notify parent (with debouncing)
  useEffect(() => {
    if (editor && onDocumentEditorChange && documentLoaded) {
      let timeoutId: NodeJS.Timeout;
      
      const handleUpdate = () => {
        // Debounce the updates to prevent excessive notifications
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const content = editor.getHTML ? editor.getHTML() : editor.getText();
          onDocumentEditorChange(editor, content, fileName || 'Untitled Document');
        }, 300); // 300ms debounce
      };

      // Register the update listener
      editor.on('update', handleUpdate);
      
      // Initial registration (only after document is loaded)
      const content = editor.getHTML ? editor.getHTML() : editor.getText();
      onDocumentEditorChange(editor, content, fileName || 'Untitled Document');
      
      return () => {
        editor.off('update', handleUpdate);
        clearTimeout(timeoutId);
      };
    }
  }, [editor, onDocumentEditorChange, fileName, documentLoaded]);

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

  // AI Operations
  const performAiOperation = useCallback(async (operation: string, selectedText?: string) => {
    if (!aiAgent || !editor || aiLoading) return;

    const textToProcess = selectedText || editor.getText();
    if (!textToProcess.trim()) return;

    setAiLoading(true);

    try {
      const prompts = {
        improve: `Please improve the following text for clarity, grammar, and style while maintaining its original meaning and tone:\n\n${textToProcess}`,
        summarize: `Please provide a concise summary of the following text:\n\n${textToProcess}`,
        expand: `Please expand and elaborate on the following text with more details and examples:\n\n${textToProcess}`,
        rewrite: `Please rewrite the following text in a different style while maintaining the same meaning:\n\n${textToProcess}`,
        fix_grammar: `Please fix any grammar, spelling, and punctuation errors in the following text:\n\n${textToProcess}`,
        make_professional: `Please rewrite the following text in a more professional tone:\n\n${textToProcess}`,
        make_casual: `Please rewrite the following text in a more casual, friendly tone:\n\n${textToProcess}`,
        translate: `Please translate the following text to English if it's in another language, or suggest a translation if you're unsure of the target language:\n\n${textToProcess}`,
      };

      const prompt = prompts[operation as keyof typeof prompts] || prompts.improve;
      
      let response = '';
      const messages = [{ role: 'user' as const, content: prompt }];

      await aiAgent.chatStream(messages, {
        onToken: (token: string) => {
          response += token;
        },
        onComplete: (fullResponse: string) => {
          if (selectedText && editor.state.selection.from !== editor.state.selection.to) {
            // Replace selected text
            const { from, to } = editor.state.selection;
            editor.chain().focus().deleteRange({ from, to }).insertContent(fullResponse).run();
          } else {
            // Replace entire content
            editor.chain().focus().setContent(fullResponse).run();
          }
          setAiLoading(false);
          setAiMenuAnchor(null);
        },
        onError: (error: Error) => {
          console.error('AI Operation Error:', error);
          setError(`AI Error: ${error.message}`);
          setAiLoading(false);
          setAiMenuAnchor(null);
        }
      });
    } catch (error) {
      console.error('Error performing AI operation:', error);
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAiLoading(false);
      setAiMenuAnchor(null);
    }
  }, [aiAgent, editor, aiLoading]);

  // Handle AI menu
  const handleAiMenuOpen = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAiMenuAnchor(event.currentTarget);
    
    // Get selected text if any
    if (editor && editor.state.selection.from !== editor.state.selection.to) {
      const selectedText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to
      );
      setSelectedText(selectedText);
    } else {
      setSelectedText('');
    }
  }, [editor]);

  const handleAiMenuClose = useCallback(() => {
    setAiMenuAnchor(null);
    setSelectedText('');
  }, []);

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
          
          {/* AI Status Indicator */}
          {aiLoading && (
            <Chip
              icon={<CircularProgress size={16} />}
              label="AI Processing..."
              size="small"
              color="primary"
              sx={{ mr: 2 }}
            />
          )}
          
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

          <Divider orientation="vertical" flexItem />

          {/* AI Model Selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>AI Model</InputLabel>
            <Select
              value={selectedModel}
              label="AI Model"
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={aiLoading}
            >
              {availableModels.map((model) => (
                <MenuItem key={model.id} value={model.id}>
                  {model.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* AI Actions */}
          <IconButton
            size="small"
            onClick={handleAiMenuOpen}
            disabled={aiLoading || !aiAgent}
            color="primary"
          >
            {aiLoading ? <CircularProgress size={16} /> : <SmartToy />}
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

      {/* AI Menu */}
      <Menu
        anchorEl={aiMenuAnchor}
        open={Boolean(aiMenuAnchor)}
        onClose={handleAiMenuClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {selectedText ? `Selected: "${selectedText.slice(0, 30)}${selectedText.length > 30 ? '...' : ''}"` : 'Entire Document'}
          </Typography>
        </Box>
        
        <MenuItem onClick={() => performAiOperation('improve', selectedText)} disabled={aiLoading}>
          <AutoFixHigh sx={{ mr: 1 }} />
          Improve Text
        </MenuItem>
        
        <MenuItem onClick={() => performAiOperation('fix_grammar', selectedText)} disabled={aiLoading}>
          <Edit sx={{ mr: 1 }} />
          Fix Grammar
        </MenuItem>
        
        <MenuItem onClick={() => performAiOperation('summarize', selectedText)} disabled={aiLoading}>
          <Summarize sx={{ mr: 1 }} />
          Summarize
        </MenuItem>
        
        <MenuItem onClick={() => performAiOperation('expand', selectedText)} disabled={aiLoading}>
          <MoreVert sx={{ mr: 1 }} />
          Expand
        </MenuItem>
        
        <MenuItem onClick={() => performAiOperation('rewrite', selectedText)} disabled={aiLoading}>
          <Edit sx={{ mr: 1 }} />
          Rewrite
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => performAiOperation('make_professional', selectedText)} disabled={aiLoading}>
          <Typography variant="body2">Make Professional</Typography>
        </MenuItem>
        
        <MenuItem onClick={() => performAiOperation('make_casual', selectedText)} disabled={aiLoading}>
          <Typography variant="body2">Make Casual</Typography>
        </MenuItem>
        
        <MenuItem onClick={() => performAiOperation('translate', selectedText)} disabled={aiLoading}>
          <Translate sx={{ mr: 1 }} />
          Translate
        </MenuItem>
      </Menu>

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
          <EditorContent editor={editor} />
        </Paper>
      </Box>
    </Box>
  );
};

export default TiptapWordEditor; 