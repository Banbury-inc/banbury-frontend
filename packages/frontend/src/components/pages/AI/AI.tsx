import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { useAlert } from '../../../renderer/context/AlertContext';
import { useAuth } from '../../../renderer/context/AuthContext';
import { OllamaClient } from '@banbury/core/src/ai';
import { BasicClient } from '@banbury/core/src/ai/basic/BasicClient';
import { Agent, ToolConfiguration } from '@banbury/core/src/ai/agent/agent';
import { LangGraphAgent, ModelConfig } from '@banbury/core/src/ai/agent/LangGraphAgent';
import { useMcpClient } from '@banbury/core/src/ai/basic/tools/banburyMCP/useMcpClient';
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
import { Conversation, DeviceInfo, ExtendedChatMessage } from '@banbury/core/src/types';
import { handleToggleTool } from './components/MessageBox/handlers/handleToggleTool';


export default function AI() {
  const { showAlert } = useAlert();
  const { updates, setUpdates } = useAuth();
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [streamingThinking, setStreamingThinking] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [enhancedAIClient, setEnhancedAIClient] = useState<BasicClient | null>(null);
  const [langChainClient, setLangChainClient] = useState<Agent | null>(null);
  const [langGraphAgent, setLangGraphAgent] = useState<LangGraphAgent | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    provider: 'ollama',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'qwen3:latest',
    temperature: 0.7
  });
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingToolCalls, setStreamingToolCalls] = useState<any[]>([]);
  const [streamingToolResults, setStreamingToolResults] = useState<any[]>([]);
  const [isPreparingToThink, setIsPreparingToThink] = useState(false);
  const [mcpToolsEnabled] = useState<boolean>(true);

  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(true);
  const [banburyEnabled, setBanburyEnabled] = useState<boolean>(true);
  const [gmailEnabled, setGmailEnabled] = useState<boolean>(true);
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState<boolean>(false);
  const [googleDriveEnabled, setGoogleDriveEnabled] = useState<boolean>(false);
  const [googleTasksEnabled, setGoogleTasksEnabled] = useState<boolean>(false);
  const [filesystemEnabled, setFilesystemEnabled] = useState<boolean>(false);
  const [isAgentMode, setIsAgentMode] = useState<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  const availableTools = [
    {
      id: 'web_search',
      label: 'Web Search',
      isVisible: true,
      isEnabled: webSearchEnabled,
    },
    {
      id: 'banbury',
      label: 'Banbury',
      isVisible: true,
      isEnabled: banburyEnabled
    },
    {
      id: 'gmail',
      label: 'Gmail',
      isVisible: true,
      isEnabled: gmailEnabled
    },
    {
      id: 'google_calendar',
      label: 'Google Calendar',
      isVisible: true,
      isEnabled: googleCalendarEnabled
    },
    {
      id: 'google_drive',
      label: 'Google Drive',
      isVisible: true,
      isEnabled: googleDriveEnabled
    },
    {
      id: 'google_tasks',
      label: 'Google Tasks',
      isVisible: true,
      isEnabled: googleTasksEnabled
    },
    {
      id: 'filesystem',
      label: 'File System',
      isVisible: true,
      isEnabled: filesystemEnabled
    },
  ];

  // Create tool configuration from availableTools state (memoized to prevent infinite re-renders)
  const toolConfig: ToolConfiguration = useMemo(() => ({
    webSearch: webSearchEnabled,
    banbury: banburyEnabled,
    filesystem: filesystemEnabled,
    gmail: gmailEnabled,
    googleCalendar: googleCalendarEnabled,
    googleDrive: googleDriveEnabled,
    googleTasks: googleTasksEnabled
  }), [webSearchEnabled, banburyEnabled, filesystemEnabled, gmailEnabled, googleCalendarEnabled, googleDriveEnabled, googleTasksEnabled]);


  // Initialize MCP client
  const {
    client: mcpClient,
  } = useMcpClient();

  // Load model configuration from localStorage on component mount
  useEffect(() => {
    const loadModelConfig = () => {
      try {
        const saved = localStorage.getItem('banbury_model_config');
        if (saved) {
          const parsedConfig = JSON.parse(saved);
          setModelConfig(prev => ({ ...prev, ...parsedConfig }));
          

        }
      } catch (error) {
        console.error('Error loading model config:', error);
      }
    };

    loadModelConfig();
  }, []);

  useEffect(() => {
    const currentModel = modelConfig.provider === 'ollama' ? modelConfig.ollamaModel || 'qwen3:latest' : 'qwen3:latest';
    
    // Initialize Ollama client
    new OllamaClient('http://localhost:11434', currentModel);

    // Initialize Enhanced AI client with MCP integration
    const enhancedClient = new BasicClient(
      'http://localhost:11434',
      currentModel,
      mcpToolsEnabled ? mcpClient : null
    );
    setEnhancedAIClient(enhancedClient);

    // Initialize LangChain AI client with MCP integration
    const langChainAiClient = new Agent(
      'http://localhost:11434',
      currentModel,
      mcpToolsEnabled ? mcpClient : null,
      undefined, // Use default file system root
      toolConfig // Pass tool configuration
    );
    setLangChainClient(langChainAiClient);

    // Initialize LangGraph Agent with current model configuration
    try {
      const langGraphAiClient = new LangGraphAgent(
        modelConfig,
        mcpToolsEnabled ? mcpClient : null,
        undefined, // Use default file system root
        toolConfig // Pass tool configuration
      );
      setLangGraphAgent(langGraphAiClient);
    } catch (error) {
      console.error('Error initializing LangGraph agent:', error);
      // If Anthropic is not configured, show a warning but continue
      if (modelConfig.provider === 'anthropic') {
        showAlert('Warning', ['Anthropic API key not configured. Please configure it in Settings > Models.'], 'warning');
      }
    }
  }, [mcpClient, mcpToolsEnabled, toolConfig, modelConfig]);

  useEffect(() => {
    // Update enhanced AI client when MCP client changes
    if (enhancedAIClient) {
      enhancedAIClient.setMcpClient(mcpToolsEnabled ? mcpClient : null);
      enhancedAIClient.setWebSearchEnabled(webSearchEnabled);
    }
    
    // Update LangChain AI client when MCP client changes
    if (langChainClient) {
      langChainClient.setMcpClient(mcpToolsEnabled ? mcpClient : null);
      langChainClient.setToolConfiguration(toolConfig);
    }

    // Update LangGraph AI client when MCP client or configuration changes
    if (langGraphAgent) {
      langGraphAgent.setMcpClient(mcpToolsEnabled ? mcpClient : null);
      langGraphAgent.setToolConfiguration(toolConfig);
      // Update model configuration to ensure correct provider/model is used
      try {
        langGraphAgent.setModelConfig(modelConfig);
      } catch (error) {
        console.error('Error updating LangGraph agent model config:', error);
        if (modelConfig.provider === 'anthropic') {
          showAlert('Warning', ['Anthropic API key not configured. Please configure it in Settings > Models.'], 'warning');
        }
      }
    }
  }, [enhancedAIClient, langChainClient, langGraphAgent, mcpClient, mcpToolsEnabled, webSearchEnabled, banburyEnabled, filesystemEnabled, gmailEnabled, googleCalendarEnabled, googleDriveEnabled, googleTasksEnabled, modelConfig]);

  useEffect(() => {
    // Scroll to bottom when messages change or streaming content updates
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, streamingThinking, streamingToolCalls, streamingToolResults, isPreparingToThink]);

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
    // Trigger global update to refresh device info in other components (like Devices page)
    setUpdates(updates + 1);
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

  const handleModelConfigChange = (newConfig: Partial<ModelConfig>) => {
    const updatedConfig = { ...modelConfig, ...newConfig };
    setModelConfig(updatedConfig);
    
    // Save to localStorage
    localStorage.setItem('banbury_model_config', JSON.stringify(updatedConfig));
    

  };

  const handleOpenSettings = () => {
    // Navigate to settings - you can implement this based on your routing
    // For now, we'll just show an alert
    showAlert('Info', ['Please go to Settings > Models to configure your API keys'], 'info');
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
      setStreamingToolResults,
      setIsPreparingToThink,
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
        deviceInfo={deviceInfo}
        handleRefreshDeviceInfo={handleRefreshDeviceInfo}
        handleSelectConversation={handleSelectConversation}
        currentConversation={currentConversation}
        handleNewChat={handleNewChat}
        modelConfig={modelConfig}
        onModelConfigChange={handleModelConfigChange}
        onOpenSettings={handleOpenSettings}
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
              streamingToolResults={streamingToolResults}
              isStreaming={isStreaming}
              isSearching={isSearching}
              isPreparingToThink={isPreparingToThink}
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
            setStreamingToolResults={setStreamingToolResults}
            setIsPreparingToThink={setIsPreparingToThink}
            abortControllerRef={abortControllerRef}
            currentModel={modelConfig.provider === 'ollama' ? modelConfig.ollamaModel || 'qwen3:latest' : modelConfig.anthropicModel || 'claude-sonnet-4-20250514'}
            setIsSearching={setIsSearching}
            showAlert={showAlert}
            ollamaClient={enhancedAIClient}
            currentConversation={currentConversation}
            setCurrentConversation={setCurrentConversation}
            handleStopGeneration={handleStopGenerationWrapper}
            webSearchEnabled={webSearchEnabled}
            setWebSearchEnabled={setWebSearchEnabled}
            isAgentMode={isAgentMode}
            setIsAgentMode={setIsAgentMode}
            mcpClient={mcpClient}
            availableTools={availableTools}
            onToggleTool={(toolId, isEnabled) => handleToggleTool(toolId, isEnabled,
              setWebSearchEnabled,
              setBanburyEnabled,
              setGmailEnabled,
              setGoogleCalendarEnabled,
              setGoogleDriveEnabled,
              setGoogleTasksEnabled,
              setFilesystemEnabled
            )}
            toolConfig={toolConfig}
            langGraphAgent={langGraphAgent}
            modelConfig={modelConfig}
          />
        </Card>
      </Stack>
    </Box>
  );
}
