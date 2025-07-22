import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  FormatClear,
} from '@mui/icons-material';
import { MentionableFile } from './MentionExtension';

interface TipTapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  getFiles?: (query: string) => MentionableFile[] | Promise<MentionableFile[]>;
  onMentionedFilesChange?: (files: MentionableFile[]) => void;
  editable?: boolean;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'Start typing...',
  getFiles,
  onMentionedFilesChange,
  editable = true,
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
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

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
      <IconButton
        onClick={onClick}
        disabled={disabled}
        size="small"
        sx={{
          color: active ? 'primary.contrastText' : 'text.primary',
          backgroundColor: active ? 'primary.main' : 'transparent',
          '&:hover': {
            backgroundColor: active ? 'primary.dark' : 'action.hover',
            color: active ? 'primary.contrastText' : 'text.primary',
          },
        }}
      >
        {children}
      </IconButton>
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
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Formatting Toolbar */}
      <Toolbar 
        variant="dense" 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          minHeight: 48,
          gap: 1,
          flexWrap: 'wrap',
          px: 1,
          flexShrink: 0,
        }}
      >
        {/* File Operations & History */}
        <ButtonGroup size="small">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            tooltip="Undo (Ctrl+Z)"
          >
            <Undo fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            tooltip="Redo (Ctrl+Y)"
          >
            <Redo fontSize="small" />
          </ToolbarButton>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Text Formatting */}
        <HeadingSelect />
        
        <ButtonGroup size="small">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            tooltip="Bullet List"
          >
            <FormatListBulleted fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            tooltip="Numbered List"
          >
            <FormatListNumbered fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            tooltip="Code Block"
          >
            <Code fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            tooltip="Quote"
          >
            <FormatQuote fontSize="small" />
          </ToolbarButton>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Text Styles */}
        <ButtonGroup size="small">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            tooltip="Bold (Ctrl+B)"
          >
            <FormatBold fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            tooltip="Italic (Ctrl+I)"
          >
            <FormatItalic fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            tooltip="Strikethrough"
          >
            <FormatStrikethrough fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            tooltip="Inline Code"
          >
            <Code fontSize="small" />
          </ToolbarButton>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Clear Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          tooltip="Clear Formatting"
        >
          <FormatClear fontSize="small" />
        </ToolbarButton>
      </Toolbar>

      {/* Editor Content */}
      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <EditorContent 
          editor={editor}
          style={{
            minHeight: '200px',
            outline: 'none',
          }}
        />
      </Box>
    </Box>
  );
};

export default TipTapEditor; 