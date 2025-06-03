import React, { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

interface MessageBubbleProps {
  isUser: boolean;
  children?: React.ReactNode;
  elevation?: number;
  content: string;
  thinking?: string;
  images?: string[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
}

const MessageBubbleRoot = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<Pick<MessageBubbleProps, 'isUser'>>(({ theme, isUser }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  maxWidth: '90%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser 
    ? theme.palette.primary.main 
    : theme.palette.background.paper,
  color: isUser 
    ? theme.palette.primary.contrastText 
    : theme.palette.text.primary,
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[2],
  wordBreak: 'break-word',
  overflow: 'hidden',
  position: 'relative',
}));

const ThinkingBlock = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.spacing(1.5),
  border: `1px solid ${theme.palette.grey[300]}`,
  '&:hover': {
    backgroundColor: theme.palette.grey[50],
  },
  ...(theme.palette.mode === 'dark' && {
    backgroundColor: theme.palette.grey[900],
    border: `1px solid ${theme.palette.grey[700]}`,
    '&:hover': {
      backgroundColor: theme.palette.grey[800],
    },
  }),
}));

const ToolBlock = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  backgroundColor: theme.palette.primary.light,
  borderRadius: theme.spacing(1.5),
  border: `1px solid ${theme.palette.primary.main}`,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  ...(theme.palette.mode === 'dark' && {
    backgroundColor: theme.palette.primary.dark,
    border: `1px solid ${theme.palette.primary.light}`,
  }),
}));

const ResultBlock = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  backgroundColor: theme.palette.success.light,
  borderRadius: theme.spacing(1.5),
  border: `1px solid ${theme.palette.success.main}`,
  '&.error': {
    backgroundColor: theme.palette.error.light,
    border: `1px solid ${theme.palette.error.main}`,
  },
  ...(theme.palette.mode === 'dark' && {
    backgroundColor: theme.palette.success.dark,
    border: `1px solid ${theme.palette.success.light}`,
    '&.error': {
      backgroundColor: theme.palette.error.dark,
      border: `1px solid ${theme.palette.error.light}`,
    },
  }),
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

const MessageContent = styled(Typography)(({ theme }) => ({
  lineHeight: 1.6,
  fontSize: '1rem',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  '& p': {
    margin: 0,
    marginBottom: theme.spacing(1),
    '&:last-child': {
      marginBottom: 0,
    },
  },
  '& ul, & ol': {
    paddingLeft: theme.spacing(3),
    margin: theme.spacing(1, 0),
  },
  '& li': {
    marginBottom: theme.spacing(0.5),
  },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    paddingLeft: theme.spacing(2),
    margin: theme.spacing(1, 0),
    fontStyle: 'italic',
    color: theme.palette.text.secondary,
  },
}));

const ImagePreview = styled('img')(({ theme }) => ({
  maxWidth: '300px',
  maxHeight: '300px',
  objectFit: 'contain',
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(1),
}));

const ImageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => (
  <Box sx={{ my: 2 }}>
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      customStyle={{
        margin: 0,
        borderRadius: '8px',
        fontSize: '14px',
        lineHeight: '1.5',
      }}
      showLineNumbers={code.split('\n').length > 3}
      wrapLines
      wrapLongLines
    >
      {code.trim()}
    </SyntaxHighlighter>
  </Box>
);

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  isUser, 
  elevation = 2, 
  content, 
  thinking, 
  images,
  toolCalls = [],
  toolResults = [],
  isStreaming = false
}) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);
  const [isResultsExpanded, setIsResultsExpanded] = useState(true);
  
  // Clean content - remove context tags, thinking tags, and normalize whitespace
  const cleanContent = content
    .replace(/<context>[\s\S]*?<\/context>\n?/g, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>\n?/g, '')
    .trim();

  // Split content into text and code blocks
  const renderContent = () => {
    if (!cleanContent) return null;
    
    const parts = cleanContent.split(/(```[\s\S]*?```)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        if (match) {
          const [, language = 'text', code] = match;
          return <CodeBlock key={index} language={language} code={code} />;
        }
      }
      
      // Skip empty parts
      if (!part.trim()) return null;
      
      return (
        <MessageContent key={index}>
          {part}
        </MessageContent>
      );
    }).filter(Boolean);
  };

  const renderToolCall = (toolCall: ToolCall, index: number) => {
    let args;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      args = toolCall.function.arguments;
    }

    return (
      <Box key={toolCall.id || index} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <BuildIcon sx={{ fontSize: 16, color: 'primary.contrastText' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.contrastText' }}>
            {toolCall.function.name}
          </Typography>
          <Chip 
            label="Tool Call" 
            size="small" 
            variant="outlined" 
            sx={{ 
              borderColor: 'primary.contrastText', 
              color: 'primary.contrastText',
              fontSize: '0.7rem'
            }} 
          />
        </Stack>
        {typeof args === 'object' && (
          <Box sx={{ 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            borderRadius: 1, 
            p: 1, 
            fontSize: '0.8rem' 
          }}>
            <Typography variant="caption" sx={{ color: 'primary.contrastText', opacity: 0.8 }}>
              Parameters: {JSON.stringify(args, null, 2)}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const renderToolResult = (result: ToolResult, index: number) => {
    const isError = !result.success;
    
    return (
      <Box key={index} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          {isError ? (
            <ErrorIcon sx={{ fontSize: 16, color: 'error.contrastText' }} />
          ) : (
            <CheckCircleIcon sx={{ fontSize: 16, color: 'success.contrastText' }} />
          )}
          <Typography variant="body2" sx={{ 
            fontWeight: 600, 
            color: isError ? 'error.contrastText' : 'success.contrastText' 
          }}>
            Tool Result
          </Typography>
          <Chip 
            label={isError ? "Error" : "Success"} 
            size="small" 
            color={isError ? "error" : "success"}
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        </Stack>
        <Box sx={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          borderRadius: 1, 
          p: 1, 
          fontSize: '0.85rem' 
        }}>
          <Typography variant="body2" sx={{ 
            color: isError ? 'error.contrastText' : 'success.contrastText',
            whiteSpace: 'pre-wrap'
          }}>
            {isError ? result.error : result.content.map(c => c.text).join('\n')}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <MessageBubbleRoot isUser={isUser} elevation={elevation}>
      {/* Images Section */}
      {images && images.length > 0 && (
        <ImageContainer>
          {images.map((image, index) => (
            <ImagePreview
              key={index}
              src={`data:image/jpeg;base64,${image}`}
              alt={`Uploaded image ${index + 1}`}
            />
          ))}
        </ImageContainer>
      )}

      {/* Thinking Section */}
      {thinking && (
        <ThinkingBlock>
          <SectionHeader onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}>
            <PsychologyIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Thinking Process
            </Typography>
            <IconButton size="small" sx={{ ml: 'auto' }}>
              {isThinkingExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </SectionHeader>
          <Collapse in={isThinkingExpanded}>
            <Box sx={{ pt: 1 }}>
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
              </Typography>
            </Box>
          </Collapse>
        </ThinkingBlock>
      )}

      {/* Tool Calls Section */}
      {toolCalls.length > 0 && (
        <ToolBlock>
          <SectionHeader onClick={() => setIsToolsExpanded(!isToolsExpanded)}>
            <BuildIcon sx={{ fontSize: 18, color: 'primary.contrastText' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.contrastText' }}>
              Tool Calls ({toolCalls.length})
            </Typography>
            <IconButton size="small" sx={{ ml: 'auto', color: 'primary.contrastText' }}>
              {isToolsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </SectionHeader>
          <Collapse in={isToolsExpanded}>
            <Box sx={{ pt: 1 }}>
              {toolCalls.map(renderToolCall)}
            </Box>
          </Collapse>
        </ToolBlock>
      )}

      {/* Tool Results Section */}
      {toolResults.length > 0 && (
        <ResultBlock className={toolResults.some(r => !r.success) ? 'error' : ''}>
          <SectionHeader onClick={() => setIsResultsExpanded(!isResultsExpanded)}>
            <CheckCircleIcon sx={{ fontSize: 18, color: 'success.contrastText' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.contrastText' }}>
              Tool Results ({toolResults.length})
            </Typography>
            <IconButton size="small" sx={{ ml: 'auto', color: 'success.contrastText' }}>
              {isResultsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </SectionHeader>
          <Collapse in={isResultsExpanded}>
            <Box sx={{ pt: 1 }}>
              {toolResults.map(renderToolResult)}
            </Box>
          </Collapse>
        </ResultBlock>
      )}

      {/* Divider between tool info and main content */}
      {(thinking || toolCalls.length > 0 || toolResults.length > 0) && cleanContent && (
        <Divider sx={{ my: 2 }} />
      )}

      {/* Main Content */}
      {cleanContent && (
        <Box sx={{ '& > :last-child': { mb: 0 } }}>
          {renderContent()}
          {isStreaming && (
            <Box sx={{ 
              display: 'inline-block', 
              animation: 'blink 1s infinite',
              '@keyframes blink': {
                '0%, 50%': { opacity: 1 },
                '51%, 100%': { opacity: 0 },
              }
            }}>
              ▌
            </Box>
          )}
        </Box>
      )}
    </MessageBubbleRoot>
  );
};

export default MessageBubble;
