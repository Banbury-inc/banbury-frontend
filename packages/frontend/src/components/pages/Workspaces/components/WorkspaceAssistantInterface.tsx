import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Paper,
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
import ChipRichTextInput from './ChipRichTextInput';
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
  // UI message type that includes visual-only message types
  type UIMessage = {
    role: 'user' | 'assistant' | 'thinking' | 'tool-call' | 'tool-result';
    content: string;
    toolName?: string;
    thinking?: boolean;
    expandableContent?: string;
    expanded?: boolean;
  };

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [currentThinking, setCurrentThinking] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('workspace_ai_model') || 'claude-sonnet-4-20250514';
  });
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>(['webSearch', 'filesystem', 'banbury']);
  const [mentionedFiles, setMentionedFiles] = useState<MentionableFile[]>([]);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Save selected model to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('workspace_ai_model', selectedModel);
  }, [selectedModel]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-scroll when messages change, streaming updates, or loading state changes
  useEffect(() => {
    // Small delay to ensure DOM is updated before scrolling
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, currentStreamingMessage, isLoading, scrollToBottom]);
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

  const toggleMessageExpansion = useCallback((messageIndex: number) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
      }
      return newSet;
    });
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
    setCurrentStreamingMessage(''); // Clear any previous streaming message

    try {
      // Check if the required API key is configured for the selected provider
      const model = availableModels.find(m => m.id === selectedModel);
      const provider = model?.provider || 'anthropic';
      
      if (provider === 'anthropic' && !modelConfig.anthropicApiKey) {
        showAlert('Error', ['Anthropic API key not configured. Please set it in Settings > Models.'], 'error');
        setIsLoading(false);
        return;
      }

      // Build conversation for AI with document context (filter out UI-only messages)
      let conversationMessages = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));
      
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

      let accumulatedResponse = '';

      // Helper function to detect step completion
      const shouldCreateNewBubble = (currentText: string): boolean => {
        // Create new bubble after significant transitions in reasoning
        const transitionPhrases = [
          'Let me try',
          'I apologize',
          'I\'ll try',
          'Let me use',
          'However,',
          'Instead,',
          'Now I\'ll',
          'Let me check',
          'Based on my available tools',
          'Alternative ways',
          'Would you like me to',
          'I can still help',
          'Let me search',
          'I\'ll search'
        ];
        
        // Only create new bubble if:
        // 1. Text contains a transition phrase
        // 2. Text is substantial (more than 50 characters)
        // 3. The phrase is near the beginning of a sentence
        return transitionPhrases.some(phrase => {
          const lowerText = currentText.toLowerCase();
          const phraseIndex = lowerText.indexOf(phrase.toLowerCase());
          
          if (phraseIndex === -1) return false;
          
          // Check if phrase is at the beginning or after sentence-ending punctuation
          const beforePhrase = lowerText.substring(0, phraseIndex).trim();
          const isAtSentenceStart = beforePhrase === '' || /[.!?]\s*$/.test(beforePhrase);
          
          return isAtSentenceStart && currentText.length > 50;
        });
      };

      await langGraphAgent.chatStream(conversationMessages, {
        onToken: (token: string) => {
          accumulatedResponse += token;
          
          // Update the current streaming message
          setCurrentStreamingMessage(accumulatedResponse);
          
          // Check if we should create a new message bubble
          if (shouldCreateNewBubble(accumulatedResponse)) {
            // Find the best break point for the message
            const findBreakPoint = (text: string): { beforeBreak: string; afterBreak: string } => {
              // Look for transition phrases to find the ideal break point
              const transitionPhrases = [
                'Let me try',
                'I apologize',
                'I\'ll try', 
                'Let me use',
                'However,',
                'Instead,',
                'Now I\'ll',
                'Let me check',
                'Based on my available tools',
                'Alternative ways',
                'Would you like me to',
                'I can still help',
                'Let me search',
                'I\'ll search'
              ];
              
              // Find the earliest transition phrase that starts a new thought
              let earliestBreakPoint = -1;
              let bestPhrase = '';
              
              for (const phrase of transitionPhrases) {
                const index = text.toLowerCase().indexOf(phrase.toLowerCase());
                if (index > 50 && (earliestBreakPoint === -1 || index < earliestBreakPoint)) {
                  // Check if it's at the start of a sentence
                  const beforePhrase = text.substring(0, index).trim();
                  if (beforePhrase === '' || /[.!?]\s*$/.test(beforePhrase)) {
                    earliestBreakPoint = index;
                    bestPhrase = phrase;
                  }
                }
              }
              
              if (earliestBreakPoint > 0) {
                // Split at the transition phrase
                return {
                  beforeBreak: text.substring(0, earliestBreakPoint).trim(),
                  afterBreak: text.substring(earliestBreakPoint).trim()
                };
              }
              
              // Fallback: split at sentence boundaries
              const sentences = text.split(/(?<=[.!?:])\s+/);
              if (sentences.length > 1) {
                return {
                  beforeBreak: sentences.slice(0, -1).join(' ').trim(),
                  afterBreak: sentences[sentences.length - 1].trim()
                };
              }
              
              // No good break point found
              return { beforeBreak: '', afterBreak: text };
            };
            
            const { beforeBreak, afterBreak } = findBreakPoint(accumulatedResponse);
            
            if (beforeBreak.length > 30) { // Only create bubble if message is substantial
              // Add the completed part as a new message
              setMessages(prev => [...prev, { role: 'assistant', content: beforeBreak }]);
              
              // Reset for the next part
              accumulatedResponse = afterBreak;
              setCurrentStreamingMessage(afterBreak);
            }
          }
        },
        onThinkingStart: () => {
          setCurrentThinking('');
          setMessages(prev => [...prev, { 
            role: 'thinking', 
            content: 'Thinking...', 
            thinking: true,
            expandableContent: '',
            expanded: false
          }]);
        },
        onThinking: (thinking: string) => {
          setCurrentThinking(thinking);
          setMessages(prev => {
            if (prev.length === 0) return prev;
            const newPrev = [...prev];
            const lastIndex = newPrev.length - 1;
            if (newPrev[lastIndex].role === 'thinking') {
              newPrev[lastIndex] = { 
                ...newPrev[lastIndex], 
                content: 'Thinking...', 
                expandableContent: thinking,
                expanded: newPrev[lastIndex].expanded || false
              } as UIMessage;
            }
            return newPrev;
          });
        },
        onThinkingEnd: () => {
          /* End thinking */
        },
        onToolCall: (toolCall) => {
          setMessages(prev => [...prev, { role: 'tool-call', content: `🔧 Calling ${toolCall.function.name}`, toolName: toolCall.function.name }]);
        },
        onToolResult: (result) => {
          const fullContent = JSON.stringify(result.content ?? '', null, 2);
          setMessages(prev => [...prev, { 
            role: 'tool-result', 
            content: '✅ Result', 
            expandableContent: fullContent,
            expanded: false
          }]);
        },
        onComplete: (fullResponse: string) => {
          // Clear the streaming message
          setCurrentStreamingMessage('');
          
          // Add any remaining content as the final message
          if (accumulatedResponse.trim()) {
            setMessages(prev => [...prev, { role: 'assistant', content: accumulatedResponse.trim() }]);
          }
          
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
          setCurrentStreamingMessage('');
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
      {/* Messages */}
      <Box ref={messagesContainerRef} sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {messages.map((message, index) => {
          const isExpanded = expandedMessages.has(index);
          const hasExpandableContent = message.expandableContent && (message.role === 'tool-result' || message.role === 'thinking');
          
          return (
            <Box
              key={index}
              sx={{
                mb: 2,
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <Box
                sx={(theme) => {
                  const bg = (role: string) => {
                    switch (role) {
                      case 'user':
                        return theme.palette.primary.main;
                      case 'assistant':
                        return theme.palette.grey[100];
                      case 'thinking':
                        return theme.palette.background.paper;
                      case 'tool-call':
                        return theme.palette.background.paper;
                      case 'tool-result':
                        return theme.palette.background.paper;
                      default:
                        return theme.palette.grey[100];
                    }
                  };
                  const getTextColor = (role: string) => {
                    switch (role) {
                      case 'tool-call':
                      case 'tool-result':
                        return '#ffffff';
                      case 'thinking':
                        return '#FFFFFF';
                      default:
                        return '#000000';
                    }
                  };
                  return {
                    maxWidth: '70%',
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: bg(message.role),
                    color: getTextColor(message.role),
                  };
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', flex: 1 }}>
                    {message.content}
                  </Typography>
                  {hasExpandableContent && (
                    <IconButton
                      size="small"
                      onClick={() => toggleMessageExpansion(index)}
                      sx={{ 
                        color: 'inherit',
                        minWidth: 'auto',
                        width: 24,
                        height: 24,
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        }
                      }}
                    >
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  )}
                </Stack>
                
                {hasExpandableContent && isExpanded && (
                  <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        opacity: 0.9,
                        display: 'block',
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}
                    >
                      {message.expandableContent}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
        
        {/* Current streaming message */}
        {currentStreamingMessage && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                maxWidth: '70%',
                p: 2,
                borderRadius: 2,
                backgroundColor: 'grey.50',
                border: 1,
                borderColor: 'grey.300',
                color: '#000000',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  right: 8,
                  bottom: 8,
                  width: 8,
                  height: 8,
                  backgroundColor: 'primary.main',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s ease-in-out infinite',
                },
                '@keyframes pulse': {
                  '0%': {
                    opacity: 1,
                  },
                  '50%': {
                    opacity: 0.5,
                  },
                  '100%': {
                    opacity: 1,
                  },
                },
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {currentStreamingMessage}
              </Typography>
            </Box>
          </Box>
        )}
        
        {/* Loading indicator when no streaming message */}
        {isLoading && !currentStreamingMessage && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: 'theme.palette.background.paper',
              }}
            >
              <Typography variant="body2" color="white">
                Thinking...
              </Typography>
            </Box>
          </Box>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{
        p: 1,
        borderTop: 1,
        borderColor: 'transparent',
        backgroundColor: (theme) => theme.palette.background.paper,
        flexShrink: 0
      }}>
        <Paper
          elevation={3}
          sx={{
            p: 1,
            borderRadius: 3,
            backgroundColor: (theme) => theme.palette.background.default,
            boxShadow: (theme) => theme.shadows[2],
            maxWidth: 600,
            margin: '0 auto',
          }}
        >
          {/* Input */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <Box sx={{ flex: 1}}>
            <ChipRichTextInput
              value={inputMessage}
              onChange={setInputMessage}
              onSubmit={handleSendMessage}
              placeholder={documentContext?.hasDocument 
                ? "Ask questions about your document or request edits... Type @ to mention files"
                : attachedFiles.length > 0 || mentionedFiles.length > 0
                  ? "Ask me about the files... Type @ to mention more files"
                  : "Ask anything... Use @ to mention files"
              }
              disabled={isLoading}
              getFiles={handleGetFiles}
              onMentionedFilesChange={handleMentionedFilesChange}
            />
          </Box>
        </Stack>
      </Box>

      {/* Attachments and Tools */}
      <Box sx={{paddingTop: 1, borderTop: 1, borderColor: 'transparent', bgcolor: 'transparent' }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
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
              paddingLeft: 'px', 
              paddingRight: '4px', 
              minWidth: '30px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
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
        </Paper>
      </Box>
    </Box>
  );
};

export default WorkspaceAssistantInterface; 