import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Chip,
  Typography,
} from '@mui/material';
import { useAlert } from '../../../renderer/context/AlertContext';
import { OllamaClient } from '@banbury/core/src/ai';
import { EnhancedAIClient } from '@banbury/core/src/ai/EnhancedAIClient';
import { useMcpClient } from './handlers/useMcpClient';
import { getSingleDeviceInfoWithDeviceName } from '@banbury/core/src/device/getSingleDeviceInfoWithDeviceName';
import os from 'os';
import { saveConversation } from './handlers/handleSaveConversation';
import { handleStopGeneration } from './components/MessageBox/handlers/handleStopGeneration';
import MessageBox from './components/MessageBox/MessageBox';
import AIToolbar from './components/AIToolbar/AIToolbar';
import ChatMessages from './components/ChatMessages/ChatMessages';
import DragDropOverlay from './components/DragDropOverlay/DragDropOverlay';
import { handleDragEnter } from './components/DragDropOverlay/handlers/handleDragEnter';
import { handleDragLeave } from './components/DragDropOverlay/handlers/handleDragLeave';
import { handleDragOver } from './components/DragDropOverlay/handlers/handleDragOver';
import { handleDrop } from './components/DragDropOverlay/handlers/handleDrop';
import { Conversation, ExtendedChatMessage } from '@banbury/core/src/types';

export default function AI() {
  const { showAlert } = useAlert();
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [streamingThinking, setStreamingThinking] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<string>('llama2:latest');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ollamaClient, setOllamaClient] = useState<OllamaClient | null>(null);
  const [enhancedAIClient, setEnhancedAIClient] = useState<EnhancedAIClient | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingToolCalls, setStreamingToolCalls] = useState<any[]>([]);
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any | null>(null);

  // Initialize MCP client
  const {
    client: mcpClient,
    isConnected: mcpConnected,
    isAuthenticated: mcpAuthenticated,
    error: mcpError,
    availableTools,
  } = useMcpClient();

  useEffect(() => {
    // Initialize Ollama client
    const client = new OllamaClient('http://localhost:11434', currentModel);
    setOllamaClient(client);

    // Initialize Enhanced AI client with MCP integration
    const enhancedClient = new EnhancedAIClient(
      'http://localhost:11434',
      currentModel,
      mcpToolsEnabled ? mcpClient : null
    );
    setEnhancedAIClient(enhancedClient);
  }, [currentModel, mcpClient, mcpToolsEnabled]);

  useEffect(() => {
    // Update enhanced AI client when MCP client changes
    if (enhancedAIClient) {
      enhancedAIClient.setMcpClient(mcpToolsEnabled ? mcpClient : null);
    }
  }, [enhancedAIClient, mcpClient, mcpToolsEnabled]);

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
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setStreamingMessage('');
  };

  const handleStopGenerationWrapper = () => {
    const saveConversationWrapper = (messages: ExtendedChatMessage[]) => {
      saveConversation(messages, currentConversation, setCurrentConversation);
    };

    handleStopGeneration(
      abortControllerRef,
      setIsStreaming,
      setIsLoading,
      setIsSearching,
      streamingMessage,
      messages,
      setMessages,
      currentConversation,
      setCurrentConversation,
      setStreamingMessage,
      setStreamingThinking,
      setStreamingToolCalls,
      saveConversationWrapper
    );
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
    onDragEnter={(e) => handleDragEnter(e, setIsDragging)}
    onDragLeave={(e) => handleDragLeave(e, setIsDragging)}
    onDragOver={(e) => handleDragOver(e, isDragging, setIsDragging)}
    onDrop={(e) => handleDrop(e, setIsDragging, showAlert)}
    >
      <DragDropOverlay isDragging={isDragging} />
      
      <AIToolbar
        currentModel={currentModel}
        setCurrentModel={setCurrentModel}
        deviceInfo={deviceInfo}
        handleRefreshDeviceInfo={handleRefreshDeviceInfo}
        handleSelectConversation={handleSelectConversation}
        currentConversation={currentConversation}
        handleNewChat={handleNewChat}
      />

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
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              streamingMessage={streamingMessage}
              streamingThinking={streamingThinking}
              streamingToolCalls={streamingToolCalls}
              isStreaming={isStreaming}
              isSearching={isSearching}
              messagesEndRef={messagesEndRef}
            />
          </CardContent>
          <MessageBox
            messages={messages}
            setMessages={setMessages}
            isLoading={isLoading}
            isStreaming={isStreaming}
            setIsLoading={setIsLoading}
            setIsStreaming={setIsStreaming}
            setStreamingMessage={setStreamingMessage}
            setStreamingThinking={setStreamingThinking}
            setStreamingToolCalls={setStreamingToolCalls}
            abortControllerRef={abortControllerRef}
            currentModel={currentModel}
            setIsSearching={setIsSearching}
            showAlert={showAlert}
            ollamaClient={mcpToolsEnabled ? enhancedAIClient : ollamaClient}
            currentConversation={currentConversation}
            setCurrentConversation={setCurrentConversation}
            handleStopGeneration={handleStopGenerationWrapper}
          />
        </Card>
      </Stack>
    </Box>
  );
}
