import React, { useRef, useState, useEffect } from 'react';
import { Box, Paper, Tooltip } from '@mui/material';
import {
  Send as SendIcon,
  Stop as StopIcon,
  Image as ImageIcon,
  Cancel as CancelIcon,
  Language as LanguageIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { AlertColor } from '@mui/material';
import { ExtendedChatMessage } from "@banbury/core/src/types";
import { Textbox } from '../../../../common/Textbox/Textbox';
import { ToolbarButton } from '../../../../common/ToolbarButton/ToolbarButton';
import { handleImageUpload } from './handlers/handleImageUpload';
import { handleSendMessage } from './handlers/handleSendMessage';
import { AVAILABLE_MODELS } from '../AIToolbar/ModelSelectorButton/constants';
import ToolsButton from './ToolsButton';

const HiddenInput = styled('input')({
  display: 'none',
});

const ImagePreviewContainer = styled(Box)({
  display: 'flex',
  gap: '8px',
  marginBottom: '16px',
  flexWrap: 'wrap',
});

const ImagePreview = styled('img')({
  width: '64px',
  height: '64px',
  objectFit: 'cover',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
});

interface MessageBoxProps {
  messages: ExtendedChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ExtendedChatMessage[]>>;
  isLoading: boolean;
  isStreaming: boolean;
  setIsLoading: (isLoading: boolean) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setStreamingMessage: (message: string) => void;
  setStreamingThinking: (thinking: string) => void;
  setStreamingToolCalls: (toolCalls: any[]) => void;
  setStreamingToolResults: (toolResults: any[]) => void;
  setIsPreparingToThink: (isPreparingToThink: boolean) => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  currentModel: string;
  setIsSearching: (isSearching: boolean) => void;
  showAlert: (title: string, messages: string[], severity: AlertColor) => void;
  ollamaClient: any;
  currentConversation: any;
  setCurrentConversation: (conversation: any) => void;
  handleStopGeneration: () => void;
  langChainOptions?: {};
  webSearchEnabled?: boolean;
  setWebSearchEnabled?: (enabled: boolean) => void;
  isAgentMode?: boolean;
  setIsAgentMode?: (enabled: boolean) => void;
  mcpClient?: any;
  availableTools: any;
}

export default function MessageBox({
  messages,
  setMessages,
  isLoading,
  isStreaming,
  setIsLoading,
  setIsStreaming,
  setStreamingMessage,
  setStreamingThinking,
  setStreamingToolCalls,
  setStreamingToolResults,
  setIsPreparingToThink,
  abortControllerRef,
  currentModel,
  setIsSearching,
  showAlert,
  ollamaClient,
  currentConversation,
  setCurrentConversation,
  handleStopGeneration,
  langChainOptions,
  webSearchEnabled = false,
  setWebSearchEnabled,
  isAgentMode = true,
  setIsAgentMode,
  mcpClient,
  availableTools
}: MessageBoxProps) {
  // Internal state management
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current model supports vision
  const currentModelInfo = AVAILABLE_MODELS.find(model => model.name === currentModel);
  const supportsVision = currentModelInfo?.vision ?? false;

  // Listen for file drop events
  useEffect(() => {
    const handleFilesDrop = (event: any) => {
      const files = event.detail.files;
      files.forEach((file: File) => {
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

    window.addEventListener('filesDrop', handleFilesDrop);
    return () => {
      window.removeEventListener('filesDrop', handleFilesDrop);
    };
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendClick = () => {
    handleSendMessage(
      inputMessage,
      selectedImages,
      messages,
      setMessages,
      setInputMessage,
      setSelectedImages,
      setIsLoading,
      setIsStreaming,
      setStreamingMessage,
      setStreamingThinking,
      setStreamingToolCalls,
      setStreamingToolResults,
      setIsPreparingToThink,
      abortControllerRef,
      currentModel,
      false, // useWebSearch no longer needed - handled by AI client as tool
      setIsSearching,
      showAlert,
      ollamaClient,
      isLoading,
      currentConversation,
      setCurrentConversation,
      langChainOptions,
      isAgentMode,
      mcpClient
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendClick();
    }
  };

  return (
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
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            autoFocus
            className="w-full"
            type="text"
            style={{ marginBottom: 16 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <ToolsButton
              availableTools={availableTools}
            />
            <HiddenInput
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={(e) => handleImageUpload(e, setSelectedImages, showAlert)}
            />


            <Tooltip title={supportsVision ? "Upload Image" : "Image uploads not supported by this model"}>
              <span>
                <ToolbarButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || !supportsVision}
                  size="small"
                  sx={{
                    minWidth: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    opacity: supportsVision ? 1 : 0.5,
                  }}
                >
                  <ImageIcon sx={{ fontSize: '1.1rem' }} />
                </ToolbarButton>
              </span>
            </Tooltip>
            {setIsAgentMode && (
              <Tooltip title={`${isAgentMode ? 'LangChain Agent' : 'Chat'} Mode - ${isAgentMode ? 'AI uses LangChain framework to analyze tool results and iterate to solve problems step-by-step' : 'Direct chat responses'}`}>
                <span>
                  <ToolbarButton
                    onClick={() => setIsAgentMode(!isAgentMode)}
                    disabled={isLoading}
                    size="small"
                    sx={{
                      minWidth: 0,
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      backgroundColor: isAgentMode ? 'rgba(33,150,243,0.15)' : 'background.paper',
                      '&:hover': {
                        backgroundColor: isAgentMode ? 'rgba(33,150,243,0.22)' : (theme) => theme.palette.action.hover,
                      },
                    }}
                  >
                    <SmartToyIcon sx={{ fontSize: '1.1rem', color: isAgentMode ? 'info.main' : 'text.secondary' }} />
                  </ToolbarButton>
                </span>
              </Tooltip>
            )}
            {setWebSearchEnabled && (
              <Tooltip title="Web Search Tool - Allow AI to search the web when needed">
                <span>
                  <ToolbarButton
                    onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                    disabled={isLoading}
                    size="small"
                    sx={{
                      minWidth: 0,
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      backgroundColor: webSearchEnabled ? 'rgba(33,150,243,0.15)' : 'background.paper',
                      '&:hover': {
                        backgroundColor: webSearchEnabled ? 'rgba(33,150,243,0.22)' : (theme) => theme.palette.action.hover,
                      },
                    }}
                  >
                    <LanguageIcon sx={{ fontSize: '1.1rem', color: webSearchEnabled ? 'info.main' : 'text.secondary' }} />
                  </ToolbarButton>
                </span>
              </Tooltip>
            )}
            <ToolbarButton
              onClick={isStreaming ? handleStopGeneration : handleSendClick}
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
  );
} 
