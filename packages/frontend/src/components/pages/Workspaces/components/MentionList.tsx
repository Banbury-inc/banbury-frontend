import React, { forwardRef, useEffect, useImperativeHandle, useState, useRef } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import { MentionableFile, getFileIcon, formatFileSize } from './MentionExtension';

export interface MentionListProps {
  items: MentionableFile[];
  command: (attrs: { id: string; type: string; name: string; path: string }) => void;
}

const MentionList = forwardRef<any, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({
        id: item.id,
        type: item.type,
        name: item.name,
        path: item.path,
      });
    }
  };

  const upHandler = () => {
    const newIndex = (selectedIndex + props.items.length - 1) % props.items.length;
    setSelectedIndex(newIndex);
  };

  const downHandler = () => {
    const newIndex = (selectedIndex + 1) % props.items.length;
    setSelectedIndex(newIndex);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  const renderFileIcon = (item: MentionableFile) => {
    if (item.type === 'folder') {
      return <FolderIcon sx={{ color: 'primary.main' }} />;
    }
    
    const emoji = getFileIcon(item.name);
    return (
      <Box sx={{ 
        fontSize: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: 24,
        height: 24
      }}>
        {emoji}
      </Box>
    );
  };

  const renderSecondaryText = (item: MentionableFile) => {
    const parts = [];
    
    if (item.type === 'folder') {
      parts.push('Folder');
    } else {
      if (item.size) {
        parts.push(formatFileSize(item.size));
      }
      if (item.extension) {
        parts.push(item.extension.toUpperCase());
      }
    }
    
    return parts.join(' • ');
  };

  if (!props.items.length) {
    return (
      <Paper sx={{ p: 2, maxWidth: 320 }}>
        <Typography variant="body2" color="text.secondary">
          No files found
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ maxWidth: 320, maxHeight: 300, overflow: 'auto' }} ref={listRef}>
      <List dense>
        {props.items.map((item, index) => (
          <ListItem
            key={item.id}
            button
            selected={index === selectedIndex}
            onClick={() => selectItem(index)}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.main',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {renderFileIcon(item)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" noWrap>
                  {item.name}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary" noWrap>
                  {renderSecondaryText(item)}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
});

MentionList.displayName = 'MentionList';

export default MentionList; 