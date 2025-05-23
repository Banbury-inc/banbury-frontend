import React, { useEffect, useState, useRef } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { CardContent, Typography, Paper, Tooltip } from "@mui/material";
import Card from '@mui/material/Card';
import { Grid } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import CancelIcon from '@mui/icons-material/Cancel';
import LanguageIcon from '@mui/icons-material/Language';
import StopIcon from '@mui/icons-material/Stop';
import { useAlert } from '../../../renderer/context/AlertContext';
import { styled } from '@mui/material/styles';
import { OllamaClient, ChatMessage as CoreChatMessage } from '@banbury/core/src/ai';
import { WebSearchService, WebSearchResult } from '@banbury/core/src/ai/web-search';
import ConversationsButton from './components/ConversationsButton';
import ModelSelectorButton from './components/ModelSelectorButton';
import { Textbox } from '../../common/Textbox/Textbox';
import { ToolbarButton } from '../../common/ToolbarButton/ToolbarButton';
import { Text } from '../../common/Text/Text';
import MessageBubble from './components/MessageBubble/MessageBuuble';


interface ChatResponse {
  model: string;
  created_at: Date;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface ExtendedChatMessage extends CoreChatMessage {
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        showAlert('Error', ['Only image files are allowed'], 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          // Extract the base64 data from the data URL
          const base64Data = e.target.result.split(',')[1];
          setSelectedImages(prev => [...prev, base64Data]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Clear the input
    event.target.value = '';
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
        saveConversation(updatedMessages);
      }
      
      // Clear streaming states
      setStreamingMessage('');
      setStreamingThinking('');
      
      // Clean up the abort controller
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && selectedImages.length === 0) || !ollamaClient || isLoading) return;

    // Clean up any existing abort controller before starting a new request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const userMessage: ExtendedChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      images: selectedImages
    };

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();

    // Update UI state
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSelectedImages([]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');
    setStreamingThinking('');

    try {
      if (useWebSearch) {
        setIsSearching(true);
        const startTime = Date.now();
        // Modify the user's message to include web search results
        const webSearchService = new WebSearchService();
        const searchResults = await webSearchService.search(inputMessage.trim());
        const duration = ((Date.now() - startTime) / 1000);
        setIsSearching(false);
        
        // Format search results into a context string
        const searchContext = searchResults.map((result: WebSearchResult) => 
          `[${result.title}]\n${result.snippet}\nSource: ${result.link}`
        ).join('\n\n');

        // Add search results and duration as context to the user message
        userMessage.content = `<context>${searchContext}</context>\n${inputMessage.trim()}`;
        userMessage.searchInfo = { duration: parseFloat(duration.toFixed(1)) };
      }

      const response = await ollamaClient.chat([...messages, userMessage], {
        stream: true,
        model: currentModel,
        useWebSearch,
        signal: abortControllerRef.current.signal
      });

      if (Symbol.asyncIterator in response) {
        // Handle streaming response
        let completeMessage = '';
        try {
          for await (const chunk of response as AsyncIterable<ChatResponse>) {
            // Check if the request was aborted
            if (abortControllerRef.current?.signal.aborted) {
              break;
            }
            completeMessage += chunk.message.content;
            const { thinking, cleanContent } = extractThinkingContent(completeMessage);
            setStreamingMessage(cleanContent);
            if (thinking) {
              setStreamingThinking(thinking);
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          throw error;
        }

        // Only add the message if we weren't aborted
        if (!abortControllerRef.current?.signal.aborted) {
          const { thinking, cleanContent } = extractThinkingContent(completeMessage);
          const assistantMessage: ExtendedChatMessage = {
            role: 'assistant',
            content: cleanContent,
            thinking
          };
          const updatedMessages = [...messages, userMessage, assistantMessage];
          setMessages(updatedMessages);
          saveConversation(updatedMessages);
        }
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
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error sending message:', error);
      showAlert('Error', ['Failed to send message', error instanceof Error ? error.message : 'Unknown error'], 'error');
    } finally {
      // Always clean up states
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessage('');
      setStreamingThinking('');
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
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
          <Box sx={{
            p: 2,
            borderTop: 1,
            pl: 8,
            pr: 3,
            borderColor: 'transparent',
            backgroundColor: (theme) => theme.palette.background.paper,
            flexShrink: 0
          }}>
            <Box sx={{
              maxWidth: '1000px',
              margin: '0 auto',
              width: '100%'
            }}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: (theme) => theme.palette.background.default,
                  boxShadow: (theme) => theme.shadows[2],
                  maxWidth: 600,
                  margin: '0 auto',
                  mt: 2,
                }}
              >
                {selectedImages.length > 0 && (
                  <ImagePreviewContainer>
                    {selectedImages.map((image, index) => (
                      <Box key={index} sx={{ position: 'relative' }}>
                        <ImagePreview 
                          src={`data:image/jpeg;base64,${image}`} 
                          alt={`Selected image ${index + 1}`} 
                        />
                        <ToolbarButton
                          onClick={() => handleRemoveImage(index)}
                          size="small"
                          sx={{
                            minWidth: 0,
                            width: 28,
                            height: 28,
                            borderRadius: 2,
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            backgroundColor: 'background.paper',
                            '&:hover': { backgroundColor: 'action.hover' },
                          }}
                        >
                          <CancelIcon sx={{ fontSize: '1.1rem' }} />
                        </ToolbarButton>
                      </Box>
                    ))}
                  </ImagePreviewContainer>
                )}
                <Textbox
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={isLoading}
                  autoFocus
                  className="w-full"
                  type="text"
                  style={{ marginBottom: 16 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <HiddenInput
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <Tooltip title="Web Search">
                    <ToolbarButton
                      onClick={() => setUseWebSearch(!useWebSearch)}
                      size="small"
                      sx={{
                        minWidth: 0,
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        backgroundColor: useWebSearch ? 'rgba(66,133,244,0.15)' : 'background.paper',
                        '&:hover': {
                          backgroundColor: useWebSearch ? 'rgba(66,133,244,0.22)' : (theme) => theme.palette.action.hover,
                        },
                      }}
                    >
                      <LanguageIcon sx={{ fontSize: '1.1rem', color: useWebSearch ? 'primary.main' : 'text.secondary' }} />
                    </ToolbarButton>
                  </Tooltip>
                  <Tooltip title="Upload Image">
                    <ToolbarButton
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      size="small"
                      sx={{
                        minWidth: 0,
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                      }}
                    >
                      <ImageIcon sx={{ fontSize: '1.1rem' }} />
                    </ToolbarButton>
                  </Tooltip>
                  <ToolbarButton
                    onClick={isStreaming ? handleStopGeneration : handleSendMessage}
                    disabled={(!isStreaming && (!inputMessage.trim() && selectedImages.length === 0))}
                    size="small"
                    sx={{
                      minWidth: 0,
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      backgroundColor: (theme) =>
                        (!inputMessage.trim() && selectedImages.length === 0) && !isStreaming
                          ? theme.palette.grey[800]
                          : theme.palette.primary.main,
                      color: (theme) =>
                        (!inputMessage.trim() && selectedImages.length === 0) && !isStreaming
                          ? theme.palette.grey[100]
                          : theme.palette.primary.contrastText,
                      '&:hover': {
                        backgroundColor: (theme) =>
                          (!inputMessage.trim() && selectedImages.length === 0) && !isStreaming
                            ? theme.palette.grey[700]
                            : theme.palette.primary.dark,
                      },
                    }}
                  >
                    {isStreaming ? <StopIcon sx={{ fontSize: '1.1rem' }} /> : <SendIcon sx={{ fontSize: '1.1rem' }} />}
                  </ToolbarButton>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Card>
      </Stack>
    </Box>
  );
}
