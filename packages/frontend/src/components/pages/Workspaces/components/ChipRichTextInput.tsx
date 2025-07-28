import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import tippy from 'tippy.js';
import { Box } from '@mui/material';
import { MentionableFile } from './MentionExtension';
import MentionList from './MentionList';

export interface ChipRichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  getFiles?: (query: string) => MentionableFile[] | Promise<MentionableFile[]>;
  onMentionedFilesChange?: (files: MentionableFile[]) => void;
}

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
  const mentionJustSelectedRef = useRef<boolean>(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            style: 'margin: 0; line-height: 1.5;',
          },
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
        emptyNodeClass: 'is-empty',
        includeChildren: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
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
                component = new ReactRenderer(MentionList, {
                  props: {
                    ...props,
                    command: (attrs: any) => {
                      // Set flag that a mention was just selected
                      mentionJustSelectedRef.current = true;
                      // Clear the flag after a short delay
                      setTimeout(() => {
                        mentionJustSelectedRef.current = false;
                      }, 100);
                      // Call the original command
                      props.command(attrs);
                    },
                  },
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
                component?.updateProps({
                  ...props,
                  command: (attrs: any) => {
                    // Set flag that a mention was just selected
                    mentionJustSelectedRef.current = true;
                    // Clear the flag after a short delay
                    setTimeout(() => {
                      mentionJustSelectedRef.current = false;
                    }, 100);
                    // Call the original command
                    props.command(attrs);
                  },
                });
                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect as any,
                });
              },
              onKeyDown(props: { event: KeyboardEvent }) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }
                return (component?.ref as any)?.onKeyDown?.({ event: props.event }) || false;
              },
              onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
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
    },
    onFocus: () => {
      // Track when editor gains focus
    },
    onBlur: () => {
      // Track when editor loses focus  
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

  const isEditorEmpty = !value || value.trim() === '';

  return (
    <Box 
      sx={{ position: 'relative', width: '100%' }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          // Check if a mention was just selected
          if (mentionJustSelectedRef.current) {
            // Don't submit if a mention was just selected
            return;
          }
          
          // Check if any tippy popups are visible (mention lists)
          const tippyInstances = document.querySelectorAll('[data-tippy-root]');
          const hasVisibleTippy = Array.from(tippyInstances).some(
            (el) => {
              const tippyEl = el as HTMLElement;
              return tippyEl.style.visibility !== 'hidden' && 
                     tippyEl.style.display !== 'none' &&
                     tippyEl.offsetParent !== null;
            }
          );
          
          if (hasVisibleTippy) {
            // If popup is visible, don't submit - let mention handle it
            return;
          }
          
          // If no popup and no recent mention selection, submit the message
          e.preventDefault();
          onSubmit?.();
        }
      }}
    >
      {/* Manual placeholder overlay */}
      {isEditorEmpty && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            color: 'rgba(255, 255, 255, 0.6)',
            pointerEvents: 'none',
            fontStyle: 'normal',
            fontSize: '14px',
            zIndex: 1,
          }}
        >
          {placeholder}
        </Box>
      )}
      
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
            '& .mention': {
              userSelect: 'none',
              pointerEvents: 'none',
              backgroundColor: 'rgba(33,150,243,0.15) !important',
              color: 'rgba(33,150,243,1) !important',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: 'rgba(33,150,243,0.25) !important',
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
              '& .ProseMirror-placeholder': {
                color: 'rgba(255, 255, 255, 0.6) !important',
                pointerEvents: 'none',
                fontStyle: 'italic',
                userSelect: 'none',
              },
              '& p.is-editor-empty:first-child::before': {
                content: 'attr(data-placeholder)',
                float: 'left',
                color: 'rgba(255, 255, 255, 0.6)',
                pointerEvents: 'none',
                height: 0,
                fontStyle: 'italic',
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