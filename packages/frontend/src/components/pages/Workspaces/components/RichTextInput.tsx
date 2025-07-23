import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  Popper,
  Paper,
  ClickAwayListener,
} from '@mui/material';
import MentionList from './MentionList';
import { MentionableFile, getFileExtension } from './MentionExtension';

export interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  getFiles?: (query: string) => MentionableFile[] | Promise<MentionableFile[]>;
  onMentionedFilesChange?: (files: MentionableFile[]) => void;
}

interface MentionState {
  isOpen: boolean;
  query: string;
  startPos: number;
  items: MentionableFile[];
}

const RichTextInput: React.FC<RichTextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  getFiles,
  onMentionedFilesChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    query: '',
    startPos: 0,
    items: [],
  });
  const [mentionedFiles, setMentionedFiles] = useState<MentionableFile[]>([]);

  const closeMentions = useCallback(() => {
    setMentionState({
      isOpen: false,
      query: '',
      startPos: 0,
      items: [],
    });
    setAnchorEl(null);
  }, []);

  const findMentionStart = useCallback((text: string, cursorPos: number): number => {
    // Find the last @ symbol before the cursor that isn't part of a completed mention
    let pos = cursorPos - 1;
    while (pos >= 0) {
      if (text[pos] === '@') {
        // Check if this @ is part of a completed mention (has a closing space or end)
        const afterAt = text.substring(pos + 1, cursorPos);
        if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
          return pos;
        }
      }
      pos--;
    }
    return -1;
  }, []);

  const handleInputChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    const cursorPos = event.target.selectionStart || 0;
    
    onChange(newValue);

    // Check for @ mentions
    const mentionStart = findMentionStart(newValue, cursorPos);
    
    if (mentionStart >= 0 && getFiles) {
      const query = newValue.substring(mentionStart + 1, cursorPos);
      
      try {
        const files = await Promise.resolve(getFiles(query));
        setMentionState({
          isOpen: true,
          query,
          startPos: mentionStart,
          items: files.slice(0, 10), // Limit to 10 items
        });
        setAnchorEl(inputRef.current);
      } catch (error) {
        console.error('Error fetching files for mention:', error);
        closeMentions();
      }
    } else {
      closeMentions();
    }
  }, [onChange, findMentionStart, getFiles, closeMentions]);

  const handleMentionSelect = useCallback((attrs: { id: string; type: string; name: string; path: string }) => {
    if (!inputRef.current) return;

    const currentValue = value;
    const beforeMention = currentValue.substring(0, mentionState.startPos);
    const afterMention = currentValue.substring(inputRef.current.selectionStart || 0);
    
    // Create the mention text
    const mentionText = `@${attrs.name}`;
    const newValue = beforeMention + mentionText + ' ' + afterMention;
    
    onChange(newValue);
    
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
    
    // Set cursor position after the mention
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length + 1;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);
  }, [value, mentionState.startPos, onChange, mentionedFiles, onMentionedFilesChange, closeMentions]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !mentionState.isOpen) {
      event.preventDefault();
      onSubmit?.();
    } else if (event.key === 'Escape' && mentionState.isOpen) {
      event.preventDefault();
      closeMentions();
    }
  }, [mentionState.isOpen, onSubmit, closeMentions]);

  // Extract mentioned files from text when component mounts or value changes externally
  useEffect(() => {
    const extractMentions = (text: string): MentionableFile[] => {
      const mentionRegex = /@(\w+(?:\.\w+)?)/g;
      const mentions: MentionableFile[] = [];
      let match;
      
      while ((match = mentionRegex.exec(text)) !== null) {
        const fileName = match[1];
        mentions.push({
          id: fileName,
          name: fileName,
          path: fileName, // We don't have full path info from just the text
          type: fileName.includes('.') ? 'file' : 'folder',
          extension: fileName.includes('.') ? getFileExtension(fileName) : undefined,
        });
      }
      
      return mentions;
    };

    const extractedMentions = extractMentions(value);
    if (extractedMentions.length !== mentionedFiles.length) {
      setMentionedFiles(extractedMentions);
      onMentionedFilesChange?.(extractedMentions);
    }
  }, [value, mentionedFiles.length, onMentionedFilesChange]);

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        multiline
        maxRows={4}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        variant="outlined"
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            fontSize: '0.875rem',
            '& fieldset': {
              border: 'transparent',
            },
            '&:hover fieldset': {
              border: 'transparent',
            },
            '&.Mui-focused fieldset': {
              border: 'transparent',
            },
          },
        }}
      />
      
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

export default RichTextInput; 