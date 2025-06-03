import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';



interface MessageBubbleProps {
  isUser: boolean;
  children?: React.ReactNode;
  elevation?: number;
  content: string;
  images?: string[];
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



const MessageContent = styled(Typography)(({ theme }) => ({
  lineHeight: 1.6,
  fontSize: 'inherit',
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
  images,
  isStreaming = false
}) => {

  
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
