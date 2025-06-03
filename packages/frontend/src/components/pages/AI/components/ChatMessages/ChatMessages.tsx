import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Text } from '../../../../common/Text/Text';
import MessageBubble from '../MessageBubble/MessageBuuble';
import { ExtendedChatMessage } from "@banbury/core/src/types";

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

const ToolCallIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.primary.dark,
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

interface ChatMessagesProps {
  messages: ExtendedChatMessage[];
  isLoading: boolean;
  streamingMessage: string;
  streamingThinking: string;
  streamingToolCalls: any[];
  isStreaming: boolean;
  isSearching: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function ChatMessages({
  messages,
  isLoading,
  streamingMessage,
  streamingThinking,
  streamingToolCalls,
  isStreaming,
  isSearching,
  messagesEndRef,
}: ChatMessagesProps) {
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
          <MessageBubble
            isUser={message.role === 'user'}
            elevation={1}
            content={message.content}
            thinking={message.thinking}
            images={message.images}
          />
          {message.agentMode && message.role === 'assistant' && (
            <SearchingIndicator
              variant="caption"
              sx={{
                alignSelf: 'flex-start',
                ml: 1,
                mb: 1,
                color: 'secondary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
            </SearchingIndicator>
          )}
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
              {streamingToolCalls.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  {streamingToolCalls.map((toolCall, index) => (
                    <ToolCallIndicator key={index}>
                      <span role="img" aria-label="tool">🔧</span>
                      <Typography variant="body2" sx={{ color: 'primary.contrastText', fontWeight: 500 }}>
                        Calling {toolCall.function?.name || toolCall.tool}...
                      </Typography>
                    </ToolCallIndicator>
                  ))}
                </Box>
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
  );
} 
