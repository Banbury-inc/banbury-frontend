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

interface WorkspaceAssistantInterfaceProps {
  documentActions?: {
    getInfo: () => any;
    getContent: () => string;
    setContent: (content: string) => boolean;
    insertContent: (content: string, position?: 'start' | 'end' | 'cursor') => boolean;
    replaceSelected: (content: string) => boolean;
  };
}

// AI Assistant Chat Interface
const WorkspaceAssistantInterface: React.FC<WorkspaceAssistantInterfaceProps> = ({ documentActions }) => {
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

  // Document context for AI
  const documentContext = useMemo(() => {
    if (!documentActions) return null;
    
    const docInfo = documentActions.getInfo();
    if (!docInfo.hasDocument) return null;

    return {
      hasDocument: true,
      fileName: docInfo.fileName,
      fileType: docInfo.fileType,
      isWordDocument: docInfo.isWordDocument,
      content: docInfo.content
    };
  }, [documentActions]);

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

      // Build conversation for AI with document context
      let conversationMessages = [...messages];
      
      // Add document context to the user message if available
      let contextualUserMessage = userMessage;
      if (documentContext && documentContext.hasDocument) {
        contextualUserMessage = {
          role: 'user' as const,
          content: `[DOCUMENT CONTEXT]
Current Document: ${documentContext.fileName} (${documentContext.fileType})
Content: ${documentContext.content}

[USER REQUEST]
${userMessage.content}

IMPORTANT: If you want to modify the document, format your response like this:
- For adding content: Use "ADD_CONTENT:" followed by the exact content to add
- For replacing content: Use "REPLACE_CONTENT:" followed by the exact new content
- For inserting at cursor: Use "INSERT_CONTENT:" followed by the exact content

Example:
ADD_CONTENT: This is the new sentence I want to add to the document.

or 

REPLACE_CONTENT: This is the complete new content that should replace the entire document.`
        };
      }
      
      conversationMessages.push(contextualUserMessage);

      let response = '';

      await langGraphAgent.chatStream(conversationMessages, {
        onToken: (token: string) => {
          response += token;
        },
        onComplete: (fullResponse: string) => {
          setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
          
          // Check if the AI response contains document modification commands
          if (documentActions && documentContext?.hasDocument) {
            try {
              // Parse for ADD_CONTENT command
              const addContentMatch = fullResponse.match(/ADD_CONTENT:\s*(.*?)(?=\n\n|\nREPLACE_CONTENT:|\nINSERT_CONTENT:|$)/s);
              if (addContentMatch) {
                const contentToAdd = addContentMatch[1].trim();
                console.log('AI wants to add content:', contentToAdd);
                documentActions.insertContent(contentToAdd, 'end');
                showAlert('Success', ['AI content added to document'], 'success');
              }
              
              // Parse for REPLACE_CONTENT command
              const replaceContentMatch = fullResponse.match(/REPLACE_CONTENT:\s*(.*?)(?=\n\n|\nADD_CONTENT:|\nINSERT_CONTENT:|$)/s);
              if (replaceContentMatch) {
                const newContent = replaceContentMatch[1].trim();
                console.log('AI wants to replace content with:', newContent);
                documentActions.setContent(newContent);
                showAlert('Success', ['Document content replaced by AI'], 'success');
              }
              
              // Parse for INSERT_CONTENT command
              const insertContentMatch = fullResponse.match(/INSERT_CONTENT:\s*(.*?)(?=\n\n|\nADD_CONTENT:|\nREPLACE_CONTENT:|$)/s);
              if (insertContentMatch) {
                const contentToInsert = insertContentMatch[1].trim();
                console.log('AI wants to insert content:', contentToInsert);
                documentActions.insertContent(contentToInsert, 'cursor');
                showAlert('Success', ['AI content inserted at cursor'], 'success');
              }
              
              // Fallback: if no special commands found but AI seems to want to add content
              if (!addContentMatch && !replaceContentMatch && !insertContentMatch) {
                const userMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
                const aiResponse = fullResponse.toLowerCase();
                
                // Check if user asked to write/add something and AI provided content
                const wantsToWrite = userMessage.includes('write') || userMessage.includes('add') || 
                                   userMessage.includes('insert') || userMessage.includes('create');
                const aiProvidesContent = aiResponse.includes('here is') || aiResponse.includes('here\'s') ||
                                        aiResponse.includes('i\'ll add') || aiResponse.includes('i\'ll write');
                
                if (wantsToWrite && aiProvidesContent) {
                  // Try to extract the content that looks like it should be added
                  const sentences = fullResponse.split(/[.!?]\s+/);
                  const lastSentence = sentences[sentences.length - 2] || sentences[sentences.length - 1];
                  
                  if (lastSentence && lastSentence.length > 10 && lastSentence.length < 500) {
                    console.log('AI fallback: adding last sentence as content:', lastSentence);
                    documentActions.insertContent(lastSentence.trim() + '.', 'end');
                    showAlert('Info', ['AI content added to document (auto-detected)'], 'info');
                  }
                }
              }
              
            } catch (error) {
              console.error('Error applying AI document changes:', error);
              showAlert('Error', ['Failed to apply AI changes to document'], 'error');
            }
          }
          
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
                  {documentContext?.hasDocument && (
                    <> • Document: {documentContext.fileName}</>
                  )}
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
        {/* Document status message */}
        {!documentContext?.hasDocument && messages.length === 0 && (
          <Box sx={{ 
            p: 2, 
            textAlign: 'center',
            backgroundColor: 'grey.50',
            borderRadius: 1,
            mb: 2
          }}>
            <Typography variant="body2" color="text.secondary">
              💡 Open a Word document to enable AI-powered document editing!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              I can help you improve, edit, and modify your documents in real-time.
            </Typography>
          </Box>
        )}
        
        {/* Document editing help message */}
        {documentContext?.hasDocument && messages.length === 0 && (
          <Box sx={{ 
            p: 2, 
            backgroundColor: 'primary.50',
            borderRadius: 1,
            mb: 2,
            border: 1,
            borderColor: 'primary.200'
          }}>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, mb: 1 }}>
              📝 Document editing enabled!
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              I can now edit your document "{documentContext.fileName}". Try commands like:
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              • "Write a sentence about artificial intelligence"<br/>
              • "Add a conclusion paragraph"<br/>
              • "Improve the introduction"<br/>
              • "Make this more professional"
            </Typography>
          </Box>
        )}
        
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
            placeholder={documentContext?.hasDocument 
              ? "Ask me to edit your document... (e.g., 'Write a sentence about AI')"
              : "Type your message..."
            }
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