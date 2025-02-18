import React, { useState, useEffect, useRef } from 'react';
import {
  Button, Popover, Box, Typography, Stack, List, ListItem, ListItemText,
  IconButton, Tooltip, Divider, TextField, Menu, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, InputAdornment
} from '@mui/material';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FolderIcon from '@mui/icons-material/Folder';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useAlert } from '../../../../context/AlertContext';
import { format } from 'date-fns';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  category?: string;
}

interface ConversationsButtonProps {
  onSelectConversation?: (conversation: Conversation) => void;
  currentConversation?: Conversation | null;
  onNewChat?: () => void;
}

export default function ConversationsButton({ onSelectConversation, currentConversation, onNewChat }: ConversationsButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const open = Boolean(anchorEl);
  const menuOpen = Boolean(menuAnchorEl);
  const { showAlert } = useAlert();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = () => {
    const savedConversations = localStorage.getItem('ai_conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        const loadedConversations = parsed.map((conv: Conversation) => ({
          ...conv,
          timestamp: new Date(conv.timestamp)
        }));
        setConversations(loadedConversations);

        // Extract unique categories
        const uniqueCategories = Array.from(new Set(loadedConversations
          .map((conv: Conversation) => conv.category)
          .filter(Boolean))) as string[];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    loadConversations(); // Refresh conversations when opening
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    if (onSelectConversation) {
      onSelectConversation(conversation);
    }
    handleClose();
  };

  const handleDeleteConversation = (event: React.MouseEvent, conversationId: string) => {
    event.stopPropagation();
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);
    localStorage.setItem('ai_conversations', JSON.stringify(updatedConversations));
    showAlert('Success', ['Conversation deleted'], 'success');
  };

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
    handleClose();
  };

  const handleEditClick = (conversation: Conversation) => {
    setEditingConversation(conversation);
    setNewTitle(conversation.title);
    setNewCategory(conversation.category || '');
  };

  const handleSaveEdit = () => {
    if (editingConversation && newTitle.trim()) {
      const updatedConversations = conversations.map(conv =>
        conv.id === editingConversation.id
          ? { ...conv, title: newTitle.trim(), category: newCategory.trim() || undefined }
          : conv
      );
      setConversations(updatedConversations);
      localStorage.setItem('ai_conversations', JSON.stringify(updatedConversations));
      setEditingConversation(null);
      showAlert('Success', ['Conversation updated'], 'success');
    }
  };

  const handleExport = () => {
    const exportData = JSON.stringify(conversations, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleMenuClose();
    showAlert('Success', ['Conversations exported successfully'], 'success');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          const validatedData = importedData.map((conv: any) => ({
            ...conv,
            timestamp: new Date(conv.timestamp)
          }));
          setConversations(validatedData);
          localStorage.setItem('ai_conversations', JSON.stringify(validatedData));
          showAlert('Success', ['Conversations imported successfully'], 'success');
        } catch (error) {
          showAlert('Error', ['Failed to import conversations', 'Invalid file format'], 'error');
        }
      };
      reader.readAsText(file);
    }
    handleMenuClose();
  };

  const filteredConversations = conversations
    .filter(conv =>
      (!selectedCategory || conv.category === selectedCategory) &&
      (!searchQuery ||
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  return (
    <>
      <Tooltip title="Conversations">
        <Button
          onClick={handleClick}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          <ChatOutlinedIcon fontSize="inherit" />
        </Button>
      </Tooltip>
      <Popover
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            width: '300px',
            backgroundColor: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            mt: 1,
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
            '& .MuiTypography-root': {
              color: '#ffffff',
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleNewChat}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                New Chat
              </Button>
              <IconButton
                onClick={handleMenuOpen}
                sx={{ color: 'grey.500' }}
              >
                <MoreVertIcon />
              </IconButton>
            </Stack>

            <TextField
              size="small"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'grey.500' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                }
              }}
            />

            {categories.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Button
                  size="small"
                  variant={selectedCategory === null ? "contained" : "outlined"}
                  onClick={() => setSelectedCategory(null)}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  All
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    size="small"
                    variant={selectedCategory === category ? "contained" : "outlined"}
                    onClick={() => setSelectedCategory(category)}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    {category}
                  </Button>
                ))}
              </Stack>
            )}

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {filteredConversations.map((conversation) => (
                <ListItem
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer',
                    backgroundColor: currentConversation?.id === conversation.id
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(conversation);
                        }}
                        sx={{ color: 'grey.500' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => handleDeleteConversation(e, conversation.id)}
                        sx={{ color: 'grey.500' }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={
                      <Stack spacing={0.5}>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                          {conversation.title}
                        </Typography>
                        {conversation.category && (
                          <Typography variant="caption" sx={{ color: 'grey.500', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FolderIcon fontSize="inherit" />
                            {conversation.category}
                          </Typography>
                        )}
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: 'grey.500' }}>
                        {format(conversation.timestamp, 'MMM d, yyyy')}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
              {filteredConversations.length === 0 && (
                <Typography
                  variant="body2"
                  sx={{
                    color: 'grey.500',
                    textAlign: 'center',
                    py: 2
                  }}
                >
                  No conversations found
                </Typography>
              )}
            </List>
          </Stack>
        </Box>
      </Popover>

      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            paddingTop: 10
          }
        }}
      >
        <MenuItem onClick={handleExport}>
          <FileDownloadIcon sx={{ mr: 1 }} />
          <Typography>Export conversations</Typography>
        </MenuItem>
        <MenuItem onClick={() => fileInputRef.current?.click()}>
          <FileUploadIcon sx={{ mr: 1 }} />
          <Typography>Import conversations</Typography>
        </MenuItem>
      </Menu>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleImport}
      />

      <Dialog
        open={Boolean(editingConversation)}
        onClose={() => setEditingConversation(null)}
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>Edit Conversation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              fullWidth
              sx={{
                '& .MuiInputBase-root': {
                  color: 'white',
                },
                '& .MuiInputLabel-root': {
                  color: 'grey.500',
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                  },
                },
              }}
            />
            <TextField
              label="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              fullWidth
              sx={{
                '& .MuiInputBase-root': {
                  color: 'white',
                },
                '& .MuiInputLabel-root': {
                  color: 'grey.500',
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                  },
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingConversation(null)} sx={{ color: 'grey.500' }}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
