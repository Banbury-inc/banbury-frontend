import React, { useEffect, useState, useRef } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { CardContent, TextField, Typography, Paper } from "@mui/material";
import Card from '@mui/material/Card';
import { List, ListItemButton, ListItemText, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useAlert } from '../../../context/AlertContext';
import { styled } from '@mui/material/styles';
import { OllamaClient, ChatMessage } from '@banbury/core/src/ai';
import type { Theme } from '@mui/material/styles';

interface MessageBubbleProps {
  isUser: boolean;
  children: React.ReactNode;
}

interface ChatResponse {
  model: string;
  created_at: Date;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<MessageBubbleProps>(({ theme, isUser }) => ({
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? theme.palette.primary.main : theme.palette.background.paper,
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  borderRadius: theme.spacing(2),
}));

export default function AI() {
  const { showAlert } = useAlert();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ollamaClient, setOllamaClient] = useState<OllamaClient | null>(null);

  useEffect(() => {
    // Initialize Ollama client
    const client = new OllamaClient();
    setOllamaClient(client);
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !ollamaClient || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await ollamaClient.chat([...messages, userMessage], { stream: false });
      
      if (Symbol.asyncIterator in response) {
        // Handle streaming response
        let fullContent = '';
        for await (const chunk of response as AsyncIterable<ChatResponse>) {
          fullContent += chunk.message.content;
        }
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: fullContent
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Handle regular response
        const chatResponse = response as unknown as ChatResponse;
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: chatResponse.message.content
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showAlert('Error', ['Failed to send message', error instanceof Error ? error.message : 'Unknown error'], 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ width: '100%', pt: 0 }}>
      <Stack direction="row" spacing={0} sx={{ width: '100%', height: 'calc(100vh - 36px)', overflow: 'hidden' }}>
        <Card variant="outlined" sx={{
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          borderLeft: 0,
          borderRight: 0,
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <CardContent sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            p: 2,
          }}>
            {messages.map((message, index) => (
              <MessageBubble 
                key={index} 
                isUser={message.role === 'user'}
                elevation={1}
              >
                <Typography variant="body1">
                  {message.content}
                </Typography>
              </MessageBubble>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={isLoading}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                  }
                }}
              />
              <IconButton 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                color="primary"
                sx={{ alignSelf: 'flex-end' }}
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </Box>
        </Card>
      </Stack>
    </Box>
  );
}
