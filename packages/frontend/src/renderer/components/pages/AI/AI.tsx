import React, { useEffect, useState, useRef } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { CardContent, TextField, Typography, Paper, Tooltip } from "@mui/material";
import Card from '@mui/material/Card';
import { List, ListItemButton, ListItemText, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useAlert } from '../../../context/AlertContext';
import { styled } from '@mui/material/styles';
import { OllamaClient, ChatMessage } from '@banbury/core/src/ai';
import type { Theme } from '@mui/material/styles';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

// Customize the VSC Dark Plus theme
const customizedTheme = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background: '#000000',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    background: '#000000',
  },
};

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
  '& pre': {
    margin: 0,
    padding: theme.spacing(1),
    borderRadius: theme.spacing(1),
    backgroundColor: '#000000',
  }
}));

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<NodeJS.Timeout>();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
      
      copyTimeout.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          zIndex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '4px',
        }}
      >
        <Tooltip title={copied ? "Copied!" : "Copy code"}>
          <IconButton 
            size="small" 
            onClick={handleCopy}
            sx={{ 
              color: copied ? 'success.main' : 'grey.400',
              '&:hover': {
                color: copied ? 'success.main' : 'grey.100',
              }
            }}
          >
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      <SyntaxHighlighter
        language={language}
        style={customizedTheme}
        customStyle={{
          margin: 0,
          borderRadius: '8px',
          backgroundColor: '#000000',
          fontSize: '14px',
        }}
        showLineNumbers
        wrapLines
        wrapLongLines
      >
        {code.trim()}
      </SyntaxHighlighter>
    </Box>
  );
};

const MessageContent: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code
          const match = part.match(/```(\w+)?\n([\s\S]+?)```/);
          if (match) {
            const [, language = 'text', code] = match;
            return (
              <Box key={index} sx={{ my: 1 }}>
                <CodeBlock language={language} code={code} />
              </Box>
            );
          }
        }
        return (
          <Typography key={index} variant="body1" component="span" sx={{ whiteSpace: 'pre-wrap' }}>
            {part}
          </Typography>
        );
      })}
    </>
  );
};

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
                <MessageContent content={message.content} />
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
