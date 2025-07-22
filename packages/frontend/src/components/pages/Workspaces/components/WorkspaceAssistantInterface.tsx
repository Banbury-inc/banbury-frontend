import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Divider,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ToolbarButton } from '../../../common/ToolbarButton/ToolbarButton';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useAlert } from '../../../../renderer/context/AlertContext';
import { LangGraphAgent, ModelConfig } from '@banbury/core/src/ai/agent/LangGraphAgent';
import { useMcpClient } from '@banbury/core/src/ai/basic/tools/banburyMCP/useMcpClient';
import FileAttachment from './FileAttachment';
import ToolSelector from './ToolSelector';
import RichTextInput from './RichTextInput';
import { fileService } from './FileService';
import { MentionableFile } from './MentionExtension';
import SendIcon from '@mui/icons-material/Send';


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

interface AttachedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
}

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
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>(['webSearch', 'filesystem', 'banbury']);
  const [mentionedFiles, setMentionedFiles] = useState<MentionableFile[]>([]);

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
    webSearch: enabledTools.includes('webSearch'),
    banbury: enabledTools.includes('banbury'),
    filesystem: enabledTools.includes('filesystem'),
    gmail: enabledTools.includes('gmail'),
    googleCalendar: enabledTools.includes('googleCalendar'),
    googleDrive: enabledTools.includes('googleDrive'),
    googleTasks: enabledTools.includes('googleTasks'),
    codeExecution: enabledTools.includes('codeExecution')
  }), [enabledTools]);

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

  // Callback handlers
  const handleFilesChange = useCallback((files: AttachedFile[]) => {
    setAttachedFiles(files);
  }, []);

  const handleToolsChange = useCallback((tools: string[]) => {
    setEnabledTools(tools);
  }, []);

  const handleMentionedFilesChange = useCallback((files: MentionableFile[]) => {
    setMentionedFiles(files);
  }, []);

  const handleGetFiles = useCallback(async (query: string) => {
    try {
      return await fileService.searchFiles(query, 10);
    } catch (error) {
      console.error('Error getting files for mentions:', error);
      return [];
    }
  }, []);

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
      
      // Add context information to the user message if available
      let contextualUserMessage = userMessage;
      
      let contextParts: string[] = [];
      
      // Add document context
      if (documentContext && documentContext.hasDocument) {
        contextParts.push(`[DOCUMENT CONTEXT]
Current Document: ${documentContext.fileName} (${documentContext.fileType})
Content: ${documentContext.content}`);
      }
      
      // Add attached files context
      if (attachedFiles.length > 0) {
        contextParts.push(`[ATTACHED FILES]
${attachedFiles.map(file => `- ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`).join('\n')}

Note: You can reference these files in your response. Use the file paths to access their content if needed.`);
      }

      // Add mentioned files context
      if (mentionedFiles.length > 0) {
        contextParts.push(`[MENTIONED FILES]
${mentionedFiles.map(file => `- @${file.name} (${file.type}${file.size ? `, ${(file.size / 1024).toFixed(1)}KB` : ''})`).join('\n')}

Note: These files were referenced in the conversation using @ mentions. You can access their content if needed.`);
      }
      
      // Add enabled tools context
      if (enabledTools.length > 0) {
        contextParts.push(`[ENABLED TOOLS]
Available capabilities: ${enabledTools.join(', ')}`);
      }
      
      // Check if user is explicitly asking for document modification
      const userWantsDocumentEdit = documentContext?.hasDocument && (
        userMessage.content.toLowerCase().includes('write') ||
        userMessage.content.toLowerCase().includes('add') ||
        userMessage.content.toLowerCase().includes('insert') ||
        userMessage.content.toLowerCase().includes('edit') ||
        userMessage.content.toLowerCase().includes('modify') ||
        userMessage.content.toLowerCase().includes('change') ||
        userMessage.content.toLowerCase().includes('update') ||
        userMessage.content.toLowerCase().includes('improve') ||
        userMessage.content.toLowerCase().includes('rewrite') ||
        userMessage.content.toLowerCase().includes('create')
      );
      
      if (contextParts.length > 0 || userWantsDocumentEdit) {
        let instructions = '';
        
        // Only add document editing instructions if user seems to want document modification
        if (userWantsDocumentEdit) {
          instructions = `

DOCUMENT EDITING CAPABILITY:
If you determine that the user wants to modify the document based on their request, you can use these commands:
- ADD_CONTENT: [content] - to add content to the document
- REPLACE_CONTENT: [content] - to replace the entire document content
- INSERT_CONTENT: [content] - to insert content at the current cursor position

Only use these commands if the user's request clearly indicates they want document modification.`;
        }
        
        contextualUserMessage = {
          role: 'user' as const,
          content: `${contextParts.length > 0 ? contextParts.join('\n\n') + '\n\n' : ''}[USER REQUEST]
${userMessage.content}${instructions}`
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
              
              // Note: Removed aggressive fallback editing - AI now only edits when explicitly commanded
              
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



  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {availableModels.find(m => m.id === selectedModel)?.name || 'Unknown Model'}
                  {documentContext?.hasDocument && (
                    <> • Document: {documentContext.fileName}</>
                  )}
                  {attachedFiles.length > 0 && (
                    <> • {attachedFiles.length} attached</>
                  )}
                  {mentionedFiles.length > 0 && (
                    <> • {mentionedFiles.length} mentioned</>
                  )}
                  {enabledTools.length > 0 && (
                    <> • {enabledTools.length} tools</>
                  )}
                </Typography>
              </Box>
            </Stack>
            <Tooltip title="Model Settings">
              <span>
                <ToolbarButton 
                  onClick={() => setShowModelSettings(!showModelSettings)}
                  sx={{ 
                    paddingLeft: '4px', 
                    paddingRight: '4px', 
                    minWidth: '30px',
                    backgroundColor: showModelSettings ? 'action.selected' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  <SettingsIcon fontSize="inherit" />
                </ToolbarButton>
              </span>
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
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <Box sx={{ flex: 1 }}>
            <RichTextInput
              value={inputMessage}
              onChange={setInputMessage}
              onSubmit={handleSendMessage}
              placeholder={documentContext?.hasDocument 
                ? "Ask questions about your document or request edits... Type @ to mention files"
                : attachedFiles.length > 0 || mentionedFiles.length > 0
                  ? "Ask me about the files... Type @ to mention more files"
                  : "Type your message... Use @ to mention files"
              }
              disabled={isLoading}
              getFiles={handleGetFiles}
              onMentionedFilesChange={handleMentionedFilesChange}
            />
          </Box>
        </Stack>
      </Box>

      {/* Attachments and Tools */}
      <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <FileAttachment
              onFilesChange={handleFilesChange}
              disabled={isLoading}
              maxFiles={5}
            />
            
            <ToolSelector
              onToolsChange={handleToolsChange}
              disabled={isLoading}
              compact={true}
            />
          </Stack>
          
          <ToolbarButton
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            sx={{ 
              paddingLeft: '4px', 
              paddingRight: '4px', 
              minWidth: '30px',
              width: 36,
              height: 36,
              borderRadius: 2,
              backgroundColor: (theme) =>
                (isLoading || !inputMessage.trim())
                  ? theme.palette.grey[800]
                  : 'rgba(33,150,243,0.15)',
              color: (theme) =>
                (isLoading || !inputMessage.trim())
                  ? theme.palette.grey[100]
                  : theme.palette.info.main,
                              '&:hover': {
                  backgroundColor: (theme) =>
                    (isLoading || !inputMessage.trim())
                      ? theme.palette.grey[700]
                      : 'rgba(33,150,243,0.22)',
                }
            }}
          >
            <SendIcon sx={{ fontSize: '1.1rem' }} />
          </ToolbarButton>
        </Stack>

        {/* Status indicators */}
        {(attachedFiles.length > 0 || mentionedFiles.length > 0 || enabledTools.length > 3) && (
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {attachedFiles.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  📎 {attachedFiles.length} attached
                </Typography>
              )}
              {mentionedFiles.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  📄 {mentionedFiles.length} mentioned
                </Typography>
              )}
              {enabledTools.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  🛠️ {enabledTools.length} tools enabled
                </Typography>
              )}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WorkspaceAssistantInterface; 