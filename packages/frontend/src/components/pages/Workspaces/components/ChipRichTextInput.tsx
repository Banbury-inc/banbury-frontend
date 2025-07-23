import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Suggestion from '@tiptap/suggestion';
import { mergeAttributes } from '@tiptap/core';
import tippy from 'tippy.js';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { MentionableFile, getFileExtension } from './MentionExtension';

export interface ChipRichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  getFiles?: (query: string) => MentionableFile[] | Promise<MentionableFile[]>;
  onMentionedFilesChange?: (files: MentionableFile[]) => void;
}

// Get appropriate icon based on file type
const getFileIcon = (file: MentionableFile): string => {
  if (file.type === 'folder') return '📁';
  
  const ext = file.extension?.toLowerCase() || '';
  switch (ext) {
    case 'pdf': return '📄';
    case 'doc':
    case 'docx': return '📝';
    case 'xls':
    case 'xlsx': return '📊';
    case 'ppt':
    case 'pptx': return '📈';
    case 'txt': return '📄';
    case 'md': return '📝';
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx': return '💻';
    case 'py': return '🐍';
    case 'java': return '☕';
    case 'cpp':
    case 'c': return '⚙️';
    case 'html': return '🌐';
    case 'css': return '🎨';
    case 'json': return '📋';
    case 'xml': return '📄';
    case 'zip':
    case 'rar': return '📦';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg': return '🖼️';
    case 'mp4':
    case 'avi':
    case 'mov': return '🎥';
    case 'mp3':
    case 'wav': return '🎵';
    default: return '📄';
  }
};

// MentionList component for suggestions (following Athena pattern)
interface MentionListProps {
  items: MentionableFile[];
  command: (item: MentionableFile) => void;
}

const MentionListComponent = React.forwardRef<
  { handleKeyDown: (event: KeyboardEvent) => boolean },
  MentionListProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowUp') {
      setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
      return true;
    }

    if (event.key === 'ArrowDown') {
      setSelectedIndex((prev) => (prev + 1) % items.length);
      return true;
    }

    if (event.key === 'Enter') {
      const selectedItem = items[selectedIndex];
      if (selectedItem) {
        command(selectedItem);
      }
      return true;
    }

    return false;
  }, [items, selectedIndex, command]);

  React.useImperativeHandle(ref, () => ({
    handleKeyDown,
  }));

  if (items.length === 0) {
    return (
      <Paper elevation={4} sx={{ p: 2, minWidth: 200 }}>
        <Typography variant="body2" color="text.secondary">
          No files found
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={4} sx={{ maxWidth: 300, maxHeight: 300, overflow: 'auto' }}>
      <List dense>
        {items.map((file, index) => (
          <ListItem
            key={file.id}
            button
            selected={index === selectedIndex}
            onClick={() => command(file)}
            onMouseEnter={() => setSelectedIndex(index)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minHeight: 40,
            }}
          >
            <Box sx={{ fontSize: '1rem', flexShrink: 0 }}>
              {getFileIcon(file)}
            </Box>
            <ListItemText 
              primary={file.name}
              primaryTypographyProps={{
                style: {
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '0.875rem',
                }
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
});

const ChipRichTextInput: React.FC<ChipRichTextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Type @ to mention files...",
  disabled = false,
  getFiles,
  onMentionedFilesChange,
}) => {
  const [mentionedFiles, setMentionedFiles] = useState<MentionableFile[]>([]);

  // Create mention extension following Athena pattern
  const suggestion = {
    char: '@',
    startOfLine: false,
    allowSpaces: false,
    items: async ({ query }: { query: string }) => {
      if (!getFiles) return [];
      const files = await Promise.resolve(getFiles(query));
      return files.slice(0, 10);
    },
    render: () => {
      let component: ReactRenderer;
      let popup: any;

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionListComponent, {
            props,
            editor: props.editor,
          });

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as any,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            offset: [0, 8],
          });
        },
        onUpdate(props: any) {
          component.updateProps(props);
          popup[0].setProps({
            getReferenceClientRect: props.clientRect as any,
          });
        },
        onKeyDown(props: { event: KeyboardEvent }) {
          if (props.event.key === 'Escape') {
            popup[0].hide();
            return true;
          }
          return (component.ref as any)?.handleKeyDown?.(props.event) || false;
        },
        onExit() {
          popup[0].destroy();
          component.destroy();
        },
      };
    },
  };

  const MentionNode = Mention.extend({
    addOptions() {
      return {
        ...this.parent?.(),
        suggestion,
        renderText({ options, node }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
        HTMLAttributes: {
          class: 'mention-chip-inline',
        },
      };
    },
  }).configure({
    suggestion,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            style: 'margin: 0; line-height: 1.5;',
          },
        },
      }),
      MentionNode,
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none tiptap-editor',
        style: `
          min-height: 20px; 
          max-height: 120px; 
          overflow-y: auto; 
          padding: 12px; 
          line-height: 1.5;
          font-size: 14px;
        `,
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          // Check if suggestion popup is open
          const tippyInstances = document.querySelectorAll('[data-tippy-root]');
          const hasOpenSuggestion = Array.from(tippyInstances).some(
            (el) => (el as HTMLElement).style.display !== 'none'
          );
          
          if (!hasOpenSuggestion) {
            event.preventDefault();
            onSubmit?.();
            return true;
          }
        }
        
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getText();
      onChange(content);

      // Extract mentioned files from content
      const extractMentionsFromEditor = (): MentionableFile[] => {
        const mentions: MentionableFile[] = [];
        
        editor.state.doc.descendants((node) => {
          if (node.type.name === 'mention') {
            const attrs = node.attrs;
            const fileName = attrs.name || attrs.id;
            
            if (fileName) {
              mentions.push({
                id: attrs.id || fileName,
                name: fileName,
                path: attrs.path || fileName,
                type: attrs.type || 'file',
                extension: attrs.extension,
              });
            }
          }
        });
        
        return mentions;
      };

      const extractedMentions = extractMentionsFromEditor();
      if (extractedMentions.length !== mentionedFiles.length) {
        setMentionedFiles(extractedMentions);
        onMentionedFilesChange?.(extractedMentions);
      }
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getText()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return <Box sx={{ p: 1 }}>Loading...</Box>;
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box 
        sx={{ 
          border: 1, 
          borderColor: 'transparent',
          borderRadius: 1,
          minHeight: 40,
          backgroundColor: 'transparent',
          '& .tiptap-editor': {
            outline: 'none',
            color: '#ffffff',
            backgroundColor: 'transparent',
            '& p': {
              margin: 0,
              color: '#ffffff',
            },
            '& .mention-chip-inline': {
              userSelect: 'none',
              pointerEvents: 'none',
              backgroundColor: 'rgba(33,150,243,0.15) !important',
              '&:hover': {
                backgroundColor: 'rgba(164, 164, 164, 0.2) !important',
              },
            },
            '& .ProseMirror-gapcursor': {
              position: 'relative',
              '&:after': {
                content: '""',
                position: 'absolute',
                top: 0,
                height: '100%',
                width: '1px',
                backgroundColor: 'white',
                animation: 'blink 1s infinite',
              },
            },
            '& .ProseMirror': {
              outline: 'none',
              '& p': {
                margin: 0,
              },
            },
            '@keyframes blink': {
              '0%, 50%': { opacity: 1 },
              '51%, 100%': { opacity: 0 },
            },
          },
          '&:focus-within': {
            borderColor: 'transparent',
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default ChipRichTextInput; 