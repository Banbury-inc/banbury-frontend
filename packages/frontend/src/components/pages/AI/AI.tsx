import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { AlertColor } from '@mui/material';
import { useAlert } from '../../../renderer/context/AlertContext';
import { Text } from '../../common/Text/Text';
import { OllamaClient, ChatMessage as CoreChatMessage } from '@banbury/core/src/ai';
import MessageBubble from './components/MessageBubble/MessageBuuble';
import { getSingleDeviceInfoWithDeviceName } from '@banbury/core/src/device/getSingleDeviceInfoWithDeviceName';
import os from 'os';
import { extractThinkingContent } from './handlers/handleExtractThinkingContent';
import { saveConversation } from './handlers/handleSaveConversation';
import ModelSelectorButton from './components/ModelSelectorButton';
import ConversationsButton from './components/ConversationsButton';
import MessageBox from './components/MessageBox';

export interface ChatResponse {
  model: string;
  created_at: Date;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface ExtendedChatMessage extends CoreChatMessage {
  thinking?: string;
  images?: string[];
  searchInfo?: {
    duration: number;
  };
}

const ImagePreview = styled('img')({
  maxWidth: '200px',
  maxHeight: '200px',
  objectFit: 'contain',
  margin: '4px',
  borderRadius: '4px',
});

const ImagePreviewContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

const HiddenInput = styled('input')({
  display: 'none',
});

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: ExtendedChatMessage[];
  category?: string;
}

// Add this near the other styled components
const SearchingIndicator = styled(Typography)`
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ThinkingIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.grey[900],
  borderRadius: theme.spacing(2),
  marginBottom: theme.spacing(1),
  width: 'fit-content',
  animation: 'fadeIn 0.3s ease-in-out',
  '@keyframes fadeIn': {
    '0%': {
      opacity: 0,
      transform: 'translateY(5px)'
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)'
    }
  }
}));

const ThinkingDot = styled(Box)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  animation: 'bounce 1.4s infinite ease-in-out',
  '&:nth-of-type(1)': {
    animationDelay: '-0.32s'
  },
  '&:nth-of-type(2)': {
    animationDelay: '-0.16s'
  },
  '@keyframes bounce': {
    '0%, 80%, 100%': {
      transform: 'scale(0)',
      opacity: 0.3
    },
    '40%': {
      transform: 'scale(1)',
      opacity: 1
    }
  }
}));

export default function AI() {
  const { showAlert } = useAlert();
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [streamingThinking, setStreamingThinking] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<string>('llava');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ollamaClient, setOllamaClient] = useState<OllamaClient | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any | null>(null);

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

  useEffect(() => {
    fetchDeviceInfo();
  }, []);

  const fetchDeviceInfo = async () => {
    try {
      const deviceName = os.hostname();
      const info = await getSingleDeviceInfoWithDeviceName(deviceName);
      setDeviceInfo(info);
    } catch (error) {
      console.error('Failed to fetch device info:', error);
    }
  };

  const handleRefreshDeviceInfo = () => {
    fetchDeviceInfo();
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


  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to true if we're entering the main container
    if (e.currentTarget === e.target) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Keep dragging state true while over any part of the container
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        showAlert('Error', ['Only image files are allowed'], 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          const base64Data = e.target.result.split(',')[1];
          setSelectedImages(prev => [...prev, base64Data]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleStopGeneration = async () => {
    if (abortControllerRef.current) {
      // Abort the current request
      abortControllerRef.current.abort();
      
      // Reset all states immediately
      setIsStreaming(false);
      setIsLoading(false);
      setIsSearching(false);
      
      // Save the partial message if it exists
      if (streamingMessage) {
        const { thinking, cleanContent } = extractThinkingContent(streamingMessage);
        const assistantMessage: ExtendedChatMessage = {
          role: 'assistant',
          content: cleanContent,
          thinking
        };
        const updatedMessages = [...messages, assistantMessage];
        setMessages(updatedMessages);
        saveConversation(updatedMessages, currentConversation, setCurrentConversation, setMessages);
      }
      
      // Clear streaming states
      setStreamingMessage('');
      setStreamingThinking('');
      
      // Clean up the abort controller
      abortControllerRef.current = null;
    }
  };


  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // MessageBox component now handles sending messages
    }
  };

  return (
    <Box sx={{
      width: '100%',
      position: 'fixed',
      top: '38px',
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column'
    }}
    onDragEnter={handleDragEnter}
    onDragLeave={handleDragLeave}
    onDragOver={handleDragOver}
    onDrop={handleDrop}
    >
      {isDragging && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Box
            sx={{
              padding: 4,
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'primary.main',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
          >
            <Typography variant="h6" sx={{ color: 'primary.main', textAlign: 'center', mb: 1 }}>
              Drop images here
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              Release to upload images
            </Typography>
          </Box>
        </Box>
      )}
      <Card variant="outlined" sx={{
        borderTop: 0,
        borderLeft: 0,
        borderBottom: 0,
        flexShrink: 0,
        borderRadius: 0,
        backgroundColor: (theme) => theme.palette.background.paper
      }}>
        <CardContent sx={{ paddingBottom: '4px !important', paddingTop: '8px !important' }}>
          <Stack spacing={2} direction="row" sx={{
            paddingLeft: 8,
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}>
            <Grid container sx={{
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 1,
              height: '100%',
            }}>
              <Grid item>
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
                  deviceInfo={deviceInfo}
                  onRefreshDeviceInfo={handleRefreshDeviceInfo}
                />
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
      <Stack
        direction="row"
        spacing={0}
        sx={{
          width: '100%',
          flexGrow: 1,
          overflow: 'hidden'
        }}
      >
        <Card variant="outlined" sx={{
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
            pl: 8,
            '&:last-child': {
              pb: 0
            }
          }}>
            <Box sx={{
              maxWidth: '1000px',
              width: '100%',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1
            }}>
              {messages.length === 0 && !isLoading && !streamingMessage && !isStreaming && (
                <Box
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 400,
                    flexDirection: 'column',
                  }}
                >
                  <Text
                    className="text-3xl sm:text-4xl font-bold text-primary-600 dark:text-primary-400 text-center mb-2"
                    style={{ marginBottom: 8 }}
                  >
                    Welcome back, Michael.
                  </Text>
                  <Text
                    className="text-lg sm:text-xl text-zinc-500 dark:text-zinc-400 text-center"
                  >
                    How can I help you today?
                  </Text>
                </Box>
              )}
              {messages.map((message, index) => (
                <React.Fragment key={index}>
                  <MessageBubble
                    isUser={message.role === 'user'}
                    elevation={1}
                    content={message.content}
                    thinking={message.thinking}
                    images={message.images}
                  />
                  {message.searchInfo && message.role === 'user' && (
                    <SearchingIndicator
                      variant="caption"
                      sx={{
                        alignSelf: 'flex-start',
                        ml: 1,
                        mb: 1,
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <span role="img" aria-label="searched">✓</span>
                      {`Searched the web (${message.searchInfo.duration.toFixed(1)}s)`}
                    </SearchingIndicator>
                  )}
                </React.Fragment>
              ))}
              {(isLoading || streamingMessage) && (
                <>
                  {isLoading && !streamingMessage && (
                    <ThinkingIndicator>
                      <ThinkingDot />
                      <ThinkingDot />
                      <ThinkingDot />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Thinking...
                      </Typography>
                    </ThinkingIndicator>
                  )}
                  {streamingMessage && (
                    <>
                      {isSearching && (
                        <SearchingIndicator
                          variant="caption"
                          sx={{
                            alignSelf: 'flex-start',
                            ml: 1,
                            mb: 1,
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            animation: 'fadeIn 0.3s ease-in-out'
                          }}
                        >
                          <span role="img" aria-label="searching">🔍</span>
                          Searching the web...
                        </SearchingIndicator>
                      )}
                      <MessageBubble
                        isUser={false}
                        elevation={1}
                        content={streamingMessage}
                        thinking={streamingThinking}
                      />
                    </>
                  )}
                  {!streamingMessage && isSearching && (
                    <SearchingIndicator
                      variant="caption"
                      sx={{
                        alignSelf: 'flex-start',
                        ml: 1,
                        mb: 1,
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        animation: 'fadeIn 0.3s ease-in-out'
                      }}
                    >
                      <span role="img" aria-label="searching"></span>
                      Searching the web...
                    </SearchingIndicator>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </Box>
          </CardContent>
          <MessageBox
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            isLoading={isLoading}
            isStreaming={isStreaming}
            useWebSearch={useWebSearch}
            setUseWebSearch={setUseWebSearch}
            messages={messages}
            setMessages={setMessages}
            setIsLoading={setIsLoading}
            setIsStreaming={setIsStreaming}
            setStreamingMessage={setStreamingMessage}
            setStreamingThinking={setStreamingThinking}
            abortControllerRef={abortControllerRef}
            currentModel={currentModel}
            setIsSearching={setIsSearching}
            showAlert={showAlert}
            ollamaClient={ollamaClient}
            currentConversation={currentConversation}
            setCurrentConversation={setCurrentConversation}
            handleStopGeneration={handleStopGeneration}
            handleRemoveImage={handleRemoveImage}
          />
        </Card>
      </Stack>
    </Box>
  );
}
