import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Divider,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useAlert } from '../../../../renderer/context/AlertContext';
import { LangGraphAgent, ModelConfig } from '@banbury/core/src/ai/agent/LangGraphAgent';
import { useMcpClient } from '@banbury/core/src/ai/basic/tools/banburyMCP/useMcpClient';

// Available AI models
const availableModels = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
  { id: 'claude-4-opus-20250101', name: 'Claude 4 Opus', provider: 'anthropic' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet', provider: 'anthropic' },
  { id: 'claude-4-haiku-20250101', name: 'Claude 4 Haiku', provider: 'anthropic' },
  { id: 'llama3.1:8b', name: 'Llama 3.1 8B', provider: 'ollama' },
  { id: 'llama3.1:70b', name: 'Llama 3.1 70B', provider: 'ollama' },
  { id: 'codellama:13b', name: 'Code Llama 13B', provider: 'ollama' },
];

// AI Assistant Chat Interface
const WorkspaceAssistantInterface = () => {
  const [langGraphAgent, setLangGraphAgent] = useState<LangGraphAgent | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('workspace_ai_model') || 'claude-sonnet-4-20250514';
  });
  const [showModelSettings, setShowModelSettings] = useState(false);

  // Save selected model to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('workspace_ai_model', selectedModel);
  }, [selectedModel]);
  const { showAlert } = useAlert();

  // Model configuration - dynamically updated based on selected model
  const modelConfig: ModelConfig = useMemo(() => {
    const model = availableModels.find(m => m.id === selectedModel);
    const provider = model?.provider || 'anthropic';
    
    const config: ModelConfig = {
      provider: provider as 'anthropic' | 'ollama',
      temperature: 0.7
    };

    if (provider === 'anthropic') {
      config.anthropicApiKey = localStorage.getItem('ANTHROPIC_API_KEY') || '';
      config.anthropicModel = selectedModel;
    } else if (provider === 'ollama') {
      config.ollamaBaseUrl = localStorage.getItem('OLLAMA_BASE_URL') || 'http://localhost:11434';
      config.ollamaModel = selectedModel;
    }

    return config;
  }, [selectedModel]);

  // Initialize MCP client
  const { client: mcpClient } = useMcpClient();

  // Tool configuration for workspace assistance
  const toolConfig = useMemo(() => ({
    webSearch: true,
    banbury: true,
    filesystem: true,
    gmail: false,
    googleCalendar: false,
    googleDrive: false,
    googleTasks: false
  }), []);

  // Initialize LangGraph Agent
  useEffect(() => {
    try {
      const agent = new LangGraphAgent(
        modelConfig,
        mcpClient,
        undefined, // Use default file system root
        toolConfig
      );
      setLangGraphAgent(agent);
    } catch (error) {
      console.error('Error initializing LangGraph agent:', error);
    }
  }, [modelConfig, mcpClient, toolConfig]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !langGraphAgent || isLoading) return;

    const userMessage = { role: 'user' as const, content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Check if the required API key is configured for the selected provider
      const model = availableModels.find(m => m.id === selectedModel);
      const provider = model?.provider || 'anthropic';
      
      if (provider === 'anthropic' && !modelConfig.anthropicApiKey) {
        showAlert('Error', ['Anthropic API key not configured. Please set it in Settings > Models.'], 'error');
        setIsLoading(false);
        return;
      }

      // Build conversation for AI - let LangGraphAgent handle system messages internally
      const allMessages = [...messages, userMessage];

      let response = '';

      await langGraphAgent.chatStream(allMessages, {
        onToken: (token: string) => {
          response += token;
        },
        onComplete: (fullResponse: string) => {
          setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
          setIsLoading(false);
        },
        onError: (error: Error) => {
          console.error('AI Error:', error);
          showAlert('Error', [`AI Error: ${error.message}`], 'error');
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      showAlert('Error', [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`], 'error');
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <SmartToyIcon color="primary" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  AI Assistant
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {availableModels.find(m => m.id === selectedModel)?.name || 'Unknown Model'}
                </Typography>
              </Box>
            </Stack>
            <Tooltip title="Model Settings">
              <IconButton 
                size="small" 
                onClick={() => setShowModelSettings(!showModelSettings)}
                sx={{ 
                  backgroundColor: showModelSettings ? 'action.selected' : 'transparent',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Model Settings Panel */}
        <Collapse in={showModelSettings}>
          <Box sx={{ p: 2, pt: 0, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Stack spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>AI Model</InputLabel>
                <Select
                  value={selectedModel}
                  label="AI Model"
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isLoading}
                >
                  {availableModels.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      <Stack>
                        <Typography variant="body2">{model.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {model.provider === 'anthropic' ? 'Anthropic' : 'Ollama'}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Typography variant="caption" color="text.secondary">
                {availableModels.find(m => m.id === selectedModel)?.provider === 'anthropic' 
                  ? 'Requires Anthropic API key in Settings > Models'
                  : 'Requires local Ollama installation'
                }
              </Typography>
            </Stack>
          </Box>
        </Collapse>
      </Box>
      
      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              mb: 2,
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Box
              sx={{
                maxWidth: '70%',
                p: 2,
                borderRadius: 2,
                backgroundColor: message.role === 'user' ? 'primary.main' : 'grey.100',
                color: '#000000',
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
            </Box>
          </Box>
        ))}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: 'grey.100',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Thinking...
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1}>
          <Box
            component="input"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            sx={{
              flex: 1,
              p: 1.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              fontSize: '0.875rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#000000',
              '&::placeholder': {
                color: '#666666',
              },
              '&:focus': {
                borderColor: 'primary.main',
              },
              '&:disabled': {
                backgroundColor: '#f5f5f5',
                color: '#999999',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            sx={{ minWidth: 80 }}
          >
            Send
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default WorkspaceAssistantInterface; 