import React, { useState } from 'react';
import { Box, Typography, Paper, Collapse, IconButton, Chip, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { Text } from '../../../../common/Text/Text';
import MessageBubble from '../MessageBubble/MessageBuuble';
import { ExtendedChatMessage } from "@banbury/core/src/types";

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolResult {
  success: boolean;
  content: Array<{ type: string; text: string }>;
  error?: string;
}

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
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: theme.palette.text.secondary,
  animation: 'bounce 1.4s ease-in-out infinite both',
  '&:nth-of-type(1)': { animationDelay: '-0.32s' },
  '&:nth-of-type(2)': { animationDelay: '-0.16s' },
  '@keyframes bounce': {
    '0%, 80%, 100%': {
      transform: 'scale(0)'
    },
    '40%': {
      transform: 'scale(1.0)'
    }
  }
}));

const SectionIndicator = styled(Typography)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  marginBottom: theme.spacing(0.5),
  alignSelf: 'flex-start',
  marginLeft: theme.spacing(1),
  color: theme.palette.text.secondary,
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

const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
  padding: theme.spacing(0.5),
  borderRadius: theme.spacing(1),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));



interface ChatMessagesProps {
  messages: ExtendedChatMessage[];
  isLoading: boolean;
  streamingMessage: string;
  streamingThinking: string;
  streamingToolCalls: any[];
  streamingToolResults?: any[];
  isStreaming: boolean;
  isSearching: boolean;
  isPreparingToThink: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function ChatMessages({
  messages,
  isLoading,
  streamingMessage,
  streamingThinking,
  streamingToolCalls,
  streamingToolResults = [],
  isStreaming,
  isSearching,
  isPreparingToThink,
  messagesEndRef,
}: ChatMessagesProps) {
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  const [streamingThinkingSections, setStreamingThinkingSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Track when streaming thinking starts and stops
  React.useEffect(() => {
    const streamingKey = 'thinking--1'; // Key for streaming thinking section
    
    if (streamingThinking && isStreaming) {
      // Thinking has started streaming - mark as streaming and auto-expand
      setStreamingThinkingSections(prev => new Set(prev).add(streamingKey));
      setExpandedSections(prev => ({
        ...prev,
        [streamingKey]: true // Force expansion when thinking starts
      }));
    }
  }, [streamingThinking, isStreaming]);

  // Handle thinking completion
  React.useEffect(() => {
    const streamingKey = 'thinking--1';
    
    // When streaming stops and we had thinking content, clean up the streaming state
    if (!isStreaming && streamingThinkingSections.has(streamingKey)) {
      // Remove from streaming sections immediately
      setStreamingThinkingSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(streamingKey);
        return newSet;
      });
      
      // Auto-collapse after a delay to let user see the completed thinking
      setTimeout(() => {
        setExpandedSections(prev => ({
          ...prev,
          [streamingKey]: false
        }));
      }, 5000); // 5 second delay before auto-collapse
    }
  }, [isStreaming, streamingThinkingSections]);

  const renderThinkingSection = (thinking: string, messageIndex: number, isStreaming: boolean = false) => {
    const sectionKey = `thinking-${messageIndex}`;
    const isStreamingThinking = streamingThinkingSections.has(sectionKey);
    
    // Always expand when streaming or when there's thinking content
    const isExpanded = isStreaming || isStreamingThinking || expandedSections[sectionKey] || (isStreaming && thinking.length > 0);

    return (
      <Box sx={{ mb: 0.5 }}>
        <SectionIndicator
          variant="caption"
          onClick={() => toggleSection(sectionKey)}
          sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
        >
          <PsychologyIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          <span>Thinking Process</span>
          {isStreaming && (
            <>
              <Box sx={{ display: 'flex', gap: 0.25, ml: 0.5 }}>
                <ThinkingDot />
                <ThinkingDot />
                <ThinkingDot />
              </Box>
            </>
          )}
          <IconButton size="small" sx={{ ml: 0.5, p: 0.25 }}>
            {isExpanded ? <ExpandLessIcon sx={{ fontSize: 12 }} /> : <ExpandMoreIcon sx={{ fontSize: 12 }} />}
          </IconButton>
        </SectionIndicator>
        <Collapse in={isExpanded}>
          <Box sx={{ ml: 3, mb: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                color: 'text.secondary',
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}
            >
              {thinking}
              {isStreaming && (
                <Box component="span" sx={{ 
                  display: 'inline-block',
                  marginLeft: 0.5,
                  animation: 'blink 0.8s infinite',
                  '@keyframes blink': {
                    '0%, 50%': { opacity: 1 },
                    '51%, 100%': { opacity: 0 },
                  }
                }}>
                  <Box component="span" sx={{ 
                    color: 'primary.main',
                    fontSize: '1em',
                    fontWeight: 'bold'
                  }}>
                    ▌
                  </Box>
                </Box>
              )}
            </Typography>
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderToolCall = (toolCall: ToolCall, index: number) => {
    let args;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      args = toolCall.function.arguments;
    }

    const sectionKey = `toolCallParams-${index}`;
    const isExpanded = expandedSections[sectionKey] || false;

    return (
      <Box key={toolCall.id || index} sx={{ mb: 0.5 }}>
        <SectionIndicator
          variant="caption"
          onClick={typeof args === 'object' ? () => toggleSection(sectionKey) : undefined}
          sx={{ 
            cursor: typeof args === 'object' ? 'pointer' : 'default',
            '&:hover': typeof args === 'object' ? { opacity: 0.8 } : {}
          }}
        >
          <BuildIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          <span>{toolCall.function.name}</span>
          <Chip 
            label="Tool" 
            size="small" 
            variant="outlined" 
            sx={{ 
              fontSize: '0.6rem',
              height: 16,
              ml: 0.5,
              '& .MuiChip-label': { px: 0.5 }
            }} 
          />
          {typeof args === 'object' && (
            <IconButton 
              size="small" 
              sx={{ ml: 0.5, p: 0.25 }}
            >
              {isExpanded ? <ExpandLessIcon sx={{ fontSize: 12 }} /> : <ExpandMoreIcon sx={{ fontSize: 12 }} />}
            </IconButton>
          )}
        </SectionIndicator>
        {typeof args === 'object' && (
          <Collapse in={isExpanded}>
            <Box sx={{ ml: 3, mb: 1 }}>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                {JSON.stringify(args, null, 2)}
              </Typography>
            </Box>
          </Collapse>
        )}
      </Box>
    );
  };

  const renderToolCallsSection = (toolCalls: ToolCall[], messageIndex: number) => {
    return (
      <Box sx={{ mb: 0.5 }}>
        {toolCalls.map(renderToolCall)}
      </Box>
    );
  };

  const renderToolResult = (result: ToolResult, index: string | number) => {
    const isError = !result.success;
    const sectionKey = `toolResult-${index}`;
    const isExpanded = expandedSections[sectionKey] || false;
    
    return (
      <Box key={index} sx={{ mb: 0.5 }}>
        <SectionIndicator
          variant="caption"
          onClick={() => toggleSection(sectionKey)}
          sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
        >
          {isError ? (
            <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />
          ) : (
            <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
          )}
          <span>Result</span>
          <Chip 
            label={isError ? "Error" : "Success"} 
            size="small" 
            color={isError ? "error" : "success"}
            variant="outlined"
            sx={{ 
              fontSize: '0.6rem',
              height: 16,
              ml: 0.5,
              '& .MuiChip-label': { px: 0.5 }
            }}
          />
          <IconButton 
            size="small" 
            sx={{ ml: 0.5, p: 0.25 }}
          >
            {isExpanded ? <ExpandLessIcon sx={{ fontSize: 12 }} /> : <ExpandMoreIcon sx={{ fontSize: 12 }} />}
          </IconButton>
        </SectionIndicator>
        <Collapse in={isExpanded}>
          <Box sx={{ ml: 3, mb: 1 }}>
            <Typography variant="caption" sx={{ 
              whiteSpace: 'pre-wrap',
              fontSize: '0.65rem',
              color: 'text.secondary'
            }}>
              {isError ? result.error : result.content.map(c => c.text).join('\n')}
            </Typography>
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderToolResultsSection = (toolResults: ToolResult[], messageIndex: number) => {
    return (
      <Box sx={{ mb: 0.5 }}>
        {toolResults.map((result, index) => renderToolResult(result, `${messageIndex}-${index}`))}
      </Box>
    );
  };
  return (
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
          {/* Render thinking section outside the bubble for assistant messages */}
          {message.role === 'assistant' && message.thinking && renderThinkingSection(message.thinking, index, false)}
          
          {/* Render tool calls section outside the bubble for assistant messages */}
          {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && renderToolCallsSection(message.toolCalls, index)}
          
          {/* Render tool results section outside the bubble for assistant messages */}
          {message.role === 'assistant' && message.toolResults && message.toolResults.length > 0 && renderToolResultsSection(message.toolResults, index)}
          
          <MessageBubble
            isUser={message.role === 'user'}
            elevation={1}
            content={message.content}
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
      {(isLoading || (streamingMessage && isStreaming)) && (
        <>
          {isLoading && !streamingMessage && !isStreaming && (
            <ThinkingIndicator>
              <ThinkingDot />
              <ThinkingDot />
              <ThinkingDot />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Thinking...
              </Typography>
            </ThinkingIndicator>
          )}
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
          {(streamingMessage || streamingThinking || streamingToolCalls.length > 0 || isPreparingToThink) && isStreaming && (
            <>
              {/* Show immediate thinking indicator when preparing to think */}
              {isPreparingToThink && !streamingThinking && !streamingMessage && (
                <SectionIndicator
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
                  <Box sx={{ display: 'flex', gap: 0.25, ml: 0.5 }}>
                    <ThinkingDot />
                    <ThinkingDot />
                    <ThinkingDot />
                  </Box>
                </SectionIndicator>
              )}
              
              {/* Render streaming thinking section outside the bubble - ALWAYS SHOW when content exists */}
              {streamingThinking && (
                <Box sx={{ mb: 0.5 }}>
                  <SectionIndicator
                    variant="caption"
                    sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                  >
                    <PsychologyIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                    <span>Thinking Process</span>
                    <Box sx={{ display: 'flex', gap: 0.25, ml: 0.5 }}>
                      <ThinkingDot />
                      <ThinkingDot />
                      <ThinkingDot />
                    </Box>
                  </SectionIndicator>
                  <Box sx={{ ml: 3, mb: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {streamingThinking}
                      <Box component="span" sx={{ 
                        display: 'inline-block',
                        marginLeft: 0.5,
                        animation: 'blink 0.8s infinite',
                        '@keyframes blink': {
                          '0%, 50%': { opacity: 1 },
                          '51%, 100%': { opacity: 0 },
                        }
                      }}>
                        <Box component="span" sx={{ 
                          color: 'primary.main',
                          fontSize: '1em',
                          fontWeight: 'bold'
                        }}>
                          ▌
                        </Box>
                      </Box>
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Render streaming tool calls section outside the bubble */}
              {streamingToolCalls.length > 0 && renderToolCallsSection(streamingToolCalls, -1)}
              
              {/* Render streaming tool results section outside the bubble */}
              {streamingToolResults.length > 0 && renderToolResultsSection(streamingToolResults, -1)}
              
              {/* Only show message bubble after thinking is complete */}
              {!streamingThinking && streamingMessage && (
                <MessageBubble
                  isUser={false}
                  elevation={1}
                  content={streamingMessage}
                  isStreaming={true}
                />
              )}
            </>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
} 
