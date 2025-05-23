import React, { useState } from 'react';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Text } from '../../../../common/Text/Text';

interface MessageBubbleProps {
  isUser: boolean;
  children?: React.ReactNode;
  elevation?: number;
  content: string;
  thinking?: string;
  images?: string[];
}

const MessageBubbleRoot = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<Pick<MessageBubbleProps, 'isUser'>>(({ theme, isUser }) => ({
  padding: `${theme.spacing(1.1)} ${theme.spacing(1.1)}`,
  marginBottom: theme.spacing(1.1),
  maxWidth: 'min(80%, 800px)',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? theme.palette.common.white : theme.palette.grey[900],
  color: isUser ? '#000' : theme.palette.text.primary,
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[1],
  '& pre': {
    margin: theme.spacing(0.5, 0),
    padding: theme.spacing(1.2),
    borderRadius: theme.spacing(1.2),
    backgroundColor: '#000000',
  },
  '& p, & span': {
    lineHeight: 1.6,
    margin: 0,
    ...(isUser ? { color: '#000 !important' } : {}),
  }
}));

const ThinkingBlock = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.1),
  marginBottom: theme.spacing(1),
  maxWidth: '100%',
  backgroundColor: theme.palette.grey[900],
  color: theme.palette.grey[400],
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.grey[800]}`,
  transition: 'all 0.2s ease-in-out',
  '& pre': {
    margin: 0,
    padding: theme.spacing(1),
    borderRadius: theme.spacing(1),
    backgroundColor: '#000000',
  }
}));

const ImagePreview = styled('img')({
  maxWidth: '200px',
  maxHeight: '200px',
  objectFit: 'contain',
  margin: '4px',
  borderRadius: '4px',
});

const ImagePreviewContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

const customizedTheme = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background: '#000000',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    background: '#000000',
  },
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => (
  <SyntaxHighlighter
    language={language}
    style={customizedTheme}
    customStyle={{
      margin: 0,
      borderRadius: '8px',
      backgroundColor: '#000000',
      fontSize: '14px',
    }}
    showLineNumbers
    wrapLines
    wrapLongLines
  >
    {code.trim()}
  </SyntaxHighlighter>
);

const MessageBubble: React.FC<MessageBubbleProps> = ({ isUser, elevation = 1, content, thinking, images }) => {
  // Filter out the context section from display
  const displayContent = content.replace(/<context>[\s\S]*?<\/context>\n?/g, '');
  const parts = displayContent.split(/(```[\s\S]*?```)/);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  return (
    <MessageBubbleRoot isUser={isUser} elevation={elevation}>
      {/* Thinking block */}
      {thinking && (
        <ThinkingBlock elevation={0}>
          <Stack spacing={0.5}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
            >
              <Text className="text-xs flex items-center gap-1 text-zinc-400">
                <span role="img" aria-label="thinking">💭</span>
                Thinking Process
              </Text>
              {isThinkingExpanded ? (
                <ExpandLessIcon fontSize="small" sx={{ color: 'grey.500' }} />
              ) : (
                <ExpandMoreIcon fontSize="small" sx={{ color: 'grey.500' }} />
              )}
            </Stack>
            <Box sx={{
              maxHeight: isThinkingExpanded ? '1000px' : '0px',
              overflow: 'hidden',
              transition: 'all 0.3s ease-in-out',
              opacity: isThinkingExpanded ? 1 : 0
            }}>
              <Text className="text-xs whitespace-pre-wrap text-zinc-400">
                {thinking}
              </Text>
            </Box>
          </Stack>
        </ThinkingBlock>
      )}
      {/* Images */}
      {images && images.length > 0 && (
        <ImagePreviewContainer>
          {images.map((image, index) => (
            <ImagePreview
              key={index}
              src={`data:image/jpeg;base64,${image}`}
              alt={`Uploaded image ${index + 1}`}
            />
          ))}
        </ImagePreviewContainer>
      )}
      {/* Main content (text/code) */}
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code
          const match = part.match(/```(\w+)?\n([\s\S]+?)```/);
          if (match) {
            const [, language = 'text', code] = match;
            return (
              <Box key={index} sx={{ my: 1 }}>
                <CodeBlock language={language} code={code} />
              </Box>
            );
          }
        }
        return (
          <Text
            key={index}
            className="whitespace-pre-wrap text-base/6"
          >
            {part}
          </Text>
        );
      })}
    </MessageBubbleRoot>
  );
};

export default MessageBubble;
