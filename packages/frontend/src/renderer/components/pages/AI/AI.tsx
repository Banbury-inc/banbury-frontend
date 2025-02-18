import React, { useEffect, useState, useRef } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { CardContent, TextField, Typography, Paper, Tooltip } from "@mui/material";
import Card from '@mui/material/Card';
import { Grid, List, ListItemButton, ListItemText, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useAlert } from '../../../context/AlertContext';
import { styled } from '@mui/material/styles';
import { OllamaClient, ChatMessage as CoreChatMessage } from '@banbury/core/src/ai';
import type { Theme } from '@mui/material/styles';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ConversationsButton from './components/ConversationsButton';
import ModelSelectorButton from './components/ModelSelectorButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
  padding: theme.spacing(1),
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

interface ExtendedChatMessage extends CoreChatMessage {
  thinking?: string;
}

const ThinkingBlock = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  maxWidth: '100%',
  backgroundColor: theme.palette.grey[900],
  color: theme.palette.grey[400],
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.grey[800]}`,
  transition: 'all 0.2s ease-in-out',
  '& pre': {
    margin: 0,
    padding: theme.spacing(1),
    borderRadius: theme.spacing(1),
    backgroundColor: '#000000',
  }
}));

const MessageContent: React.FC<{ content: string; thinking?: string }> = ({ content, thinking }) => {
  const parts = content.split(/(```[\s\S]*?```)/);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  
  return (
    <>
      {thinking && (
        <ThinkingBlock elevation={0}>
          <Stack spacing={1}>
            <Stack 
              direction="row" 
              spacing={1} 
              alignItems="center" 
              sx={{ 
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
            >
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span role="img" aria-label="thinking">💭</span>
                Thinking Process
              </Typography>
              {isThinkingExpanded ? (
                <ExpandLessIcon fontSize="small" sx={{ color: 'grey.500' }} />
              ) : (
                <ExpandMoreIcon fontSize="small" sx={{ color: 'grey.500' }} />
              )}
            </Stack>
            <Box sx={{ 
              maxHeight: isThinkingExpanded ? '1000px' : '0px',
              overflow: 'hidden',
              transition: 'all 0.3s ease-in-out',
              opacity: isThinkingExpanded ? 1 : 0
            }}>
              <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                {thinking}
              </Typography>
            </Box>
          </Stack>
        </ThinkingBlock>
      )}
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
          <Typography key={index} variant="inherit" component="span" sx={{ whiteSpace: 'pre-wrap' }}>
            {part}
          </Typography>
        );
      })}
    </>
  );
};

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: ExtendedChatMessage[];
  category?: string;
}

const extractThinkingContent = (content: string): { thinking?: string; cleanContent: string } => {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/;
  const match = content.match(thinkRegex);
  
  if (match) {
    // Remove all <think> blocks from the content
    const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return {
      thinking: match[1].trim(),
      cleanContent
    };
  }
  
  return { cleanContent: content };
};

export default function AI() {
  const { showAlert } = useAlert();
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [streamingThinking, setStreamingThinking] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<string>('llama2');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [ollamaClient, setOllamaClient] = useState<OllamaClient | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    // Initialize Ollama client
    const client = new OllamaClient('http://localhost:11434', currentModel);
    setOllamaClient(client);
    
    // Focus the input field
    inputRef.current?.focus();
  }, [currentModel]);

  useEffect(() => {
    // Scroll to bottom when messages change or streaming content updates
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const saveConversation = (messages: ExtendedChatMessage[]) => {
    if (messages.length === 0) return;

    const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? '...' : '');
    const lastMessage = messages[messages.length - 1].content.slice(0, 100) + 
      (messages[messages.length - 1].content.length > 100 ? '...' : '');

    const conversation: Conversation = {
      id: currentConversation?.id || crypto.randomUUID(),
      title,
      lastMessage,
      timestamp: new Date(),
      messages: messages.filter(msg => 
        msg.role === 'user' || msg.role === 'assistant'
      )
    };

    // Load existing conversations
    const savedConversations = localStorage.getItem('ai_conversations');
    let conversations: Conversation[] = [];
    if (savedConversations) {
      try {
        conversations = JSON.parse(savedConversations);
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    }

    // Update or add the conversation
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);
    if (existingIndex !== -1) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.unshift(conversation);
    }

    // Save back to localStorage
    localStorage.setItem('ai_conversations', JSON.stringify(conversations));
    setCurrentConversation(conversation);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setMessages(conversation.messages);
    setStreamingMessage('');
    setInputMessage('');
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setInputMessage('');
    setStreamingMessage('');
    inputRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !ollamaClient || isLoading) return;

    const userMessage: ExtendedChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setStreamingMessage('');
    setStreamingThinking('');

    try {
      const response = await ollamaClient.chat([...messages, userMessage], { 
        stream: true,
        model: currentModel 
      });
      
      if (Symbol.asyncIterator in response) {
        // Handle streaming response
        let completeMessage = '';
        for await (const chunk of response as AsyncIterable<ChatResponse>) {
          completeMessage += chunk.message.content;
          const { thinking, cleanContent } = extractThinkingContent(completeMessage);
          setStreamingMessage(cleanContent);
          if (thinking) {
            setStreamingThinking(thinking);
          }
        }
        // After streaming is complete, add the message to the list
        const { thinking, cleanContent } = extractThinkingContent(completeMessage);
        const assistantMessage: ExtendedChatMessage = {
          role: 'assistant',
          content: cleanContent,
          thinking
        };
        const updatedMessages = [...messages, userMessage, assistantMessage];
        setMessages(updatedMessages);
        setStreamingMessage('');
        setStreamingThinking('');
        saveConversation(updatedMessages);
      } else {
        // Handle non-streaming response (fallback)
        const chatResponse = response as unknown as ChatResponse;
        const { thinking, cleanContent } = extractThinkingContent(chatResponse.message.content);
        const assistantMessage: ExtendedChatMessage = {
          role: 'assistant',
          content: cleanContent,
          thinking
        };
        const updatedMessages = [...messages, userMessage, assistantMessage];
        setMessages(updatedMessages);
        saveConversation(updatedMessages);
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
      <Card variant="outlined" sx={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
        <CardContent sx={{ paddingBottom: '4px !important', paddingTop: '36px' }}>
          <Stack spacing={2} direction="row" sx={{ flexWrap: 'nowrap' }}>
            <Grid container spacing={0} sx={{ display: 'flex', flexWrap: 'nowrap', pt: 0 }}>
              <Grid item paddingRight={1}>
                <ConversationsButton 
                  onSelectConversation={handleSelectConversation}
                  currentConversation={currentConversation}
                  onNewChat={handleNewChat}
                />
              </Grid>
              <Grid item>
                <ModelSelectorButton
                  currentModel={currentModel}
                  onModelChange={setCurrentModel}
                />
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
      <Stack direction="row" spacing={0} sx={{ width: '100%', height: 'calc(100vh - 76px)', overflow: 'hidden' }}>

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
                <MessageContent content={message.content} thinking={message.thinking} />
              </MessageBubble>
            ))}
            {streamingMessage && (
              <MessageBubble 
                isUser={false}
                elevation={1}
              >
                <MessageContent content={streamingMessage} thinking={streamingThinking} />
              </MessageBubble>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          <Box sx={{ 
            p: 1.5, 
            borderTop: 0, 
            borderColor: 'divider',
            backgroundColor: (theme) => theme.palette.background.paper,
          }}>
            <Box sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                multiline
                maxRows={20}
                size="small"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={isLoading}
                inputRef={inputRef}
                autoFocus
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    minHeight: '32px',
                    backgroundColor: (theme) => theme.palette.background.default,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: (theme) => theme.palette.action.hover,
                    },
                    '&.Mui-focused': {
                      backgroundColor: (theme) => theme.palette.background.default,
                      '& fieldset': {
                        borderColor: (theme) => theme.palette.primary.main,
                        borderWidth: '1px',
                      },
                    },
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '4px 14px',
                    paddingRight: '44px',
                    fontSize: '0.875rem',
                    lineHeight: 1.3,
                    minHeight: '10px',
                    maxHeight: '600px',
                    overflow: 'auto !important',
                    '&::placeholder': {
                      fontSize: '0.875rem',
                      opacity: 0.7,
                    },
                  },
                  '& textarea': {
                    resize: 'none',
                    marginTop: '0 !important',
                    marginBottom: '0 !important',
                  },
                }}
              />
              <IconButton 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                color="primary"
                size="small"
                sx={{ 
                  position: 'absolute',
                  right: '8px',
                  bottom: '8px',
                  width: '28px',
                  height: '28px',
                  minWidth: '28px',
                  minHeight: '18px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: (theme) => theme.palette.primary.main,
                  color: (theme) => theme.palette.primary.contrastText,
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    backgroundColor: (theme) => theme.palette.primary.dark,
                    transform: 'scale(1.05)',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                  },
                  '&:active': {
                    transform: 'scale(0.98)',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                  },
                  '&:disabled': {
                    backgroundColor: (theme) => theme.palette.action.disabledBackground,
                    color: (theme) => theme.palette.action.disabled,
                    boxShadow: 'none',
                  },
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  '& .MuiSvgIcon-root': {
                    display: 'flex',
                    margin: 'auto',
                  }
                }}
              >
                <SendIcon sx={{ 
                  fontSize: '1.1rem',
                  display: 'block',
                }} />
              </IconButton>
            </Box>
          </Box>
        </Card>
      </Stack>
    </Box>
  );
}
