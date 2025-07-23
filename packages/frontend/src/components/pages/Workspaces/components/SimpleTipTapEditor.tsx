import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import {
  Box,
  Toolbar,
  IconButton,
  Divider,
  ButtonGroup,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  Undo,
  Redo,
  FormatBold,
  FormatItalic,
  FormatStrikethrough,
  Code,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  FormatClear,
  Save,
} from '@mui/icons-material';

interface SimpleTipTapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  onSave?: () => void;
  onEditorReady?: (editor: any) => void;
}

const SimpleTipTapEditor: React.FC<SimpleTipTapEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'Start typing...',
  editable = true,
  onSave,
  onEditorReady,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      try {
        // Ensure content is valid before setting
        const safeContent = content || '<p></p>';
        editor.commands.setContent(safeContent);
      } catch (error) {
        console.error('Error setting editor content:', error);
        // Fallback to empty content on error
        editor.commands.setContent('<p></p>');
      }
    }
  }, [content, editor]);

  // Pass editor instance to parent for AI integration
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  const ToolbarButton = ({ 
    onClick, 
    active = false, 
    disabled = false, 
    children, 
    tooltip 
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    tooltip: string;
  }) => (
    <Tooltip title={tooltip}>
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          size="small"
          sx={{
            color: active ? '#1976d2' : '#424242',
            backgroundColor: active ? '#e3f2fd' : 'transparent',
            border: active ? '1px solid #1976d2' : '1px solid transparent',
            borderRadius: 1,
            '&:hover': {
              backgroundColor: active ? '#bbdefb' : '#f5f5f5',
              color: active ? '#0d47a1' : '#212121',
              border: '1px solid #ccc',
            },
            '&:disabled': {
              color: '#bdbdbd',
              backgroundColor: 'transparent',
            },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );

  const HeadingSelect = () => (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <Select
        value={
          editor?.isActive('heading', { level: 1 }) ? 'h1' :
          editor?.isActive('heading', { level: 2 }) ? 'h2' :
          editor?.isActive('heading', { level: 3 }) ? 'h3' :
          'paragraph'
        }
        onChange={(e) => {
          const value = e.target.value;
          if (value === 'paragraph') {
            editor?.chain().focus().setParagraph().run();
          } else {
            const level = parseInt(value.replace('h', '')) as 1 | 2 | 3;
            editor?.chain().focus().toggleHeading({ level }).run();
          }
        }}
        disabled={!editor}
        variant="outlined"
        sx={{
          backgroundColor: '#fff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ccc',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#999',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1976d2',
          },
          '& .MuiSelect-select': {
            color: '#333',
            fontSize: '14px',
          },
        }}
      >
        <MenuItem value="paragraph">Paragraph</MenuItem>
        <MenuItem value="h1">Heading 1</MenuItem>
        <MenuItem value="h2">Heading 2</MenuItem>
        <MenuItem value="h3">Heading 3</MenuItem>
      </Select>
    </FormControl>
  );

  if (!editor) {
    return <Box sx={{ p: 2 }}>Loading editor...</Box>;
  }

  return (
    <Box sx={{ 
      border: 1, 
      borderColor: '#e0e0e0', 
      borderRadius: 1, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      overflow: 'hidden'
    }}>
      {/* Formatting Toolbar */}
      <Toolbar 
        variant="dense" 
        sx={{ 
          borderBottom: 1, 
          borderColor: '#e0e0e0',
          minHeight: 48,
          flexShrink: 0,
          gap: 1,
          flexWrap: 'wrap',
          px: 1,
          py: 0.5,
          backgroundColor: '#fafafa',
          '& .MuiButtonGroup-root': {
            '& .MuiButtonBase-root': {
              minWidth: 32,
            },
          },
        }}
      >
        {/* File Operations & History */}
        <ButtonGroup size="small" variant="outlined">
          {onSave && (
            <ToolbarButton
              onClick={onSave}
              tooltip="Save"
            >
              <Save fontSize="inherit" />
            </ToolbarButton>
          )}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            tooltip="Undo (Ctrl+Z)"
          >
            <Undo fontSize="inherit" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            tooltip="Redo (Ctrl+Y)"
          >
            <Redo fontSize="inherit" />
          </ToolbarButton>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Text Formatting */}
        <HeadingSelect />
        
        <ButtonGroup size="small" variant="outlined">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            tooltip="Bullet List"
          >
            <FormatListBulleted fontSize="inherit" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            tooltip="Numbered List"
          >
            <FormatListNumbered fontSize="inherit" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            tooltip="Code Block"
          >
            <Code fontSize="inherit" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            tooltip="Quote"
          >
            <FormatQuote fontSize="inherit" />
          </ToolbarButton>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Text Styles */}
        <ButtonGroup size="small" variant="outlined">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            tooltip="Bold (Ctrl+B)"
          >
            <FormatBold fontSize="inherit" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            tooltip="Italic (Ctrl+I)"
          >
            <FormatItalic fontSize="inherit" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            tooltip="Strikethrough"
          >
            <FormatStrikethrough fontSize="inherit" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            tooltip="Inline Code"
          >
            <Code fontSize="inherit" />
          </ToolbarButton>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Clear Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          tooltip="Clear Formatting"
        >
          <FormatClear fontSize="inherit" />
        </ToolbarButton>
      </Toolbar>

      {/* Editor Content */}
      <Box sx={{ 
        p: 3, 
        flex: 1, 
        overflow: 'auto',
        backgroundColor: '#ffffff !important',
        minHeight: 0, // Important for flex child to respect parent's height
        '& .ProseMirror': {
          outline: 'none',
          minHeight: '100%',
          color: '#000000',
          backgroundColor: '#ffffff !important',
          paddingBottom: '50px', // Add some bottom padding for better scrolling experience
          '& p': {
            margin: '0.5em 0',
            color: '#000000',
            lineHeight: 1.6,
          },
          '& h1, & h2, & h3': {
            marginTop: '1em',
            marginBottom: '0.5em',
            fontWeight: 600,
            color: '#1976d2',
          },
          '& h1': {
            fontSize: '2em',
          },
          '& h2': {
            fontSize: '1.5em',
          },
          '& h3': {
            fontSize: '1.25em',
          },
          '& ul, & ol': {
            paddingLeft: '1.5em',
            margin: '0.5em 0',
          },
          '& li': {
            margin: '0.25em 0',
            color: '#000000',
          },
          '& blockquote': {
            borderLeft: '4px solid #1976d2',
            paddingLeft: '1em',
            margin: '1em 0',
            fontStyle: 'italic',
            color: '#333',
            backgroundColor: '#f8f9fa',
          },
          '& pre': {
            backgroundColor: '#f5f5f5',
            color: '#000000',
            padding: '1em',
            borderRadius: '0.5em',
            overflow: 'auto',
            border: '1px solid #ddd',
          },
          '& code': {
            backgroundColor: '#f5f5f5',
            color: '#d32f2f',
            padding: '0.125em 0.25em',
            borderRadius: '0.25em',
            fontSize: '0.875em',
            border: '1px solid #ddd',
          },
          '& strong': {
            color: '#1976d2',
            fontWeight: 600,
          },
          '& em': {
            color: '#7b1fa2',
            fontStyle: 'italic',
          },
        },
        '& .tiptap': {
          height: '100%',
        }
      }}>
        <EditorContent editor={editor} style={{ height: '100%' }} />
      </Box>
    </Box>
  );
};

export default SimpleTipTapEditor; 