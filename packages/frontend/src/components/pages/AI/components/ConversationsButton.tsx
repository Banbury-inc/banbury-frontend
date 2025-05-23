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
import { useAlert } from '../../../../renderer/context/AlertContext';
import { format } from 'date-fns';
import { Textbox } from '../../../common/Textbox/Textbox';
import { ToolbarButton } from '../../../common/ToolbarButton/ToolbarButton';
import AddIcon from '@mui/icons-material/Add';

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
          console.error('Error importing conversations:', error);
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
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <ToolbarButton
                onClick={handleNewChat}
                sx={{
                  minWidth: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                }}
              >
                <AddIcon sx={{ fontSize: '1.1rem' }} />
              </ToolbarButton>
              <ToolbarButton
                onClick={handleMenuOpen}
                sx={{
                  minWidth: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                }}
              >
                <MoreVertIcon sx={{ fontSize: '1.1rem' }} />
              </ToolbarButton>
            </Stack>

            <Box sx={{ position: 'relative', width: '100%' }}>
              <Textbox
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full"
                type="text"
                style={{ marginBottom: 16 }}
              />
            </Box>

            {categories.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <ToolbarButton
                  onClick={() => setSelectedCategory(null)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    backgroundColor: selectedCategory === null ? 'primary.main' : 'transparent',
                    color: selectedCategory === null ? 'primary.contrastText' : 'inherit',
                    border: selectedCategory === null ? 'none' : '1px solid',
                    borderColor: selectedCategory === null ? 'transparent' : 'primary.main',
                    minWidth: 0,
                    px: 2,
                  }}
                >
                  All
                </ToolbarButton>
                {categories.map(category => (
                  <ToolbarButton
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      backgroundColor: selectedCategory === category ? 'primary.main' : 'transparent',
                      color: selectedCategory === category ? 'primary.contrastText' : 'inherit',
                      border: selectedCategory === category ? 'none' : '1px solid',
                      borderColor: selectedCategory === category ? 'transparent' : 'primary.main',
                      minWidth: 0,
                      px: 2,
                    }}
                  >
                    {category}
                  </ToolbarButton>
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
                      <ToolbarButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(conversation);
                        }}
                        sx={{
                        minWidth: 0,
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                      }}
                      >
                        <EditIcon sx={{ fontSize: '1.1rem' }} />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={(e) => handleDeleteConversation(e, conversation.id)}
                        sx={{
                          minWidth: 0,
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: '1.1rem' }} />
                      </ToolbarButton>
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
            <Textbox
              value={newTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
              placeholder="Title"
              className="w-full"
              type="text"
              style={{ color: 'white', background: 'transparent' }}
            />
            <Textbox
              value={newCategory}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategory(e.target.value)}
              placeholder="Category"
              className="w-full"
              type="text"
              style={{ color: 'white', background: 'transparent' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <ToolbarButton onClick={() => setEditingConversation(null)} sx={{ color: 'grey.500' }}>
            Cancel
          </ToolbarButton>
          <ToolbarButton onClick={handleSaveEdit} sx={{ backgroundColor: 'primary.main', color: 'primary.contrastText', '&:hover': { backgroundColor: 'primary.dark' } }}>
            Save
          </ToolbarButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
