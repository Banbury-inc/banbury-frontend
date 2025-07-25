import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Box,
  IconButton,
  Tooltip,
  ButtonGroup,
  Popper,
  ClickAwayListener,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatStrikethrough,
  Code,
  FormatListBulleted,
  FormatListNumbered,
  FormatClear,
} from '@mui/icons-material';
import MentionList from './MentionList';
import { MentionableFile, getFileExtension } from './MentionExtension';

export interface EnhancedRichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  getFiles?: (query: string) => MentionableFile[] | Promise<MentionableFile[]>;
  onMentionedFilesChange?: (files: MentionableFile[]) => void;
  maxRows?: number;
}

interface MentionState {
  isOpen: boolean;
  query: string;
  startPos: number;
  items: MentionableFile[];
}

const EnhancedRichTextInput: React.FC<EnhancedRichTextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  getFiles,
  onMentionedFilesChange,
  maxRows: _maxRows = 4,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    query: '',
    startPos: 0,
    items: [],
  });
  const [mentionedFiles, setMentionedFiles] = useState<MentionableFile[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            style: 'margin: 0;',
          },
        },
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none',
        style: 'min-height: 20px; max-height: 120px; overflow-y: auto; padding: 8px 12px;',
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey && !mentionState.isOpen) {
          event.preventDefault();
          onSubmit?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
      
      // Check for @ mentions
      const { state } = editor;
      const { selection } = state;
      const { from } = selection;
      
      // Get text before cursor
      const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, ' ');
      const mentionMatch = /@(\w*)$/.exec(textBefore);
      
      if (mentionMatch && getFiles) {
        const query = mentionMatch[1];
        handleMentionQuery(query, from - mentionMatch[1].length - 1);
      } else {
        closeMentions();
      }
    },
  });

  const handleMentionQuery = useCallback(async (query: string, startPos: number) => {
    if (!getFiles) return;
    
    try {
      const files = await Promise.resolve(getFiles(query));
      setMentionState({
        isOpen: true,
        query,
        startPos,
        items: files.slice(0, 10),
      });
      setAnchorEl(editorRef.current);
    } catch (error) {
      console.error('Error fetching files for mention:', error);
      closeMentions();
    }
  }, [getFiles]);

  const closeMentions = useCallback(() => {
    setMentionState({
      isOpen: false,
      query: '',
      startPos: 0,
      items: [],
    });
    setAnchorEl(null);
  }, []);

  const handleMentionSelect = useCallback((attrs: { id: string; type: string; name: string; path: string }) => {
    if (!editor) return;

    const { state } = editor;
    const { selection } = state;
    const { from } = selection;
    
    // Replace the @ and query with the mention
    const mentionText = `@${attrs.name} `;
    const startPos = from - mentionState.query.length - 1; // -1 for the @
    
    editor.chain()
      .focus()
      .deleteRange({ from: startPos, to: from })
      .insertContent(mentionText)
      .run();
    
    // Track mentioned file
    const mentionedFile: MentionableFile = {
      id: attrs.id,
      name: attrs.name,
      path: attrs.path,
      type: attrs.type as 'file' | 'folder',
      extension: attrs.type === 'file' ? getFileExtension(attrs.name) : undefined,
    };
    
    const updatedMentionedFiles = [...mentionedFiles, mentionedFile];
    setMentionedFiles(updatedMentionedFiles);
    onMentionedFilesChange?.(updatedMentionedFiles);
    
    closeMentions();
  }, [editor, mentionState.query.length, mentionedFiles, onMentionedFilesChange, closeMentions]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const ToolbarButton = ({ 
    onClick, 
    active = false, 
    disabled: buttonDisabled = false, 
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
          disabled={disabled || buttonDisabled}
          size="small"
          sx={{
            color: active ? '#1976d2' : '#616161',
            backgroundColor: active ? '#e3f2fd' : 'transparent',
            border: active ? '1px solid #1976d2' : '1px solid transparent',
            borderRadius: 1,
            '&:hover': {
              backgroundColor: active ? '#bbdefb' : '#f5f5f5',
              color: active ? '#0d47a1' : '#424242',
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

  if (!editor) {
    return <Box sx={{ p: 1 }}>Loading...</Box>;
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {/* Formatting Toolbar */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: '#e0e0e0',
        backgroundColor: '#fafafa',
        px: 2,
        py: 1,
        borderRadius: '4px 4px 0 0',
        '& .MuiButtonGroup-root': {
          '& .MuiButtonBase-root': {
            minWidth: 28,
            height: 28,
          },
        },
      }}>
        <ButtonGroup size="small">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            tooltip="Bold"
          >
            <FormatBold fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            tooltip="Italic"
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
            tooltip="Code"
          >
            <Code fontSize="small" />
          </ToolbarButton>
        </ButtonGroup>

        <ButtonGroup size="small" sx={{ ml: 1 }}>
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
        </ButtonGroup>

        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          tooltip="Clear Formatting"
        >
          <FormatClear fontSize="small" />
        </ToolbarButton>
      </Box>

      {/* Editor Content */}
      <Box 
        ref={editorRef}
        sx={{ 
          border: 1, 
          borderColor: '#e0e0e0', 
          borderRadius: '0 0 4px 4px',
          minHeight: 40,
          backgroundColor: '#ffffff !important',
          '& .ProseMirror': {
            outline: 'none',
            color: '#000000',
            backgroundColor: '#ffffff !important',
            '& p': {
              margin: 0,
              color: '#000000',
            },
            '& ul, & ol': {
              paddingLeft: '1.5em',
              margin: '0.25em 0',
            },
            '& li': {
              margin: '0.125em 0',
              color: '#000000',
            },
            '& code': {
              backgroundColor: '#f5f5f5',
              color: '#d32f2f',
              padding: '0.125em 0.25em',
              borderRadius: '0.25em',
              fontSize: '0.875em',
              border: '1px solid #e0e0e0',
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
          '&:focus-within': {
            borderColor: '#1976d2',
            boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
          },
        }}
      >
        <EditorContent 
          editor={editor}
          placeholder={placeholder}
        />
      </Box>
      
      <Popper
        open={mentionState.isOpen}
        anchorEl={anchorEl}
        placement="top-start"
        style={{ zIndex: 1300 }}
      >
        <ClickAwayListener onClickAway={closeMentions}>
          <Box>
            <MentionList
              items={mentionState.items}
              command={handleMentionSelect}
            />
          </Box>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
};

export default EnhancedRichTextInput; 