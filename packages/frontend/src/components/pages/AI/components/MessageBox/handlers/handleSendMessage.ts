import React from 'react';
import { flushSync } from 'react-dom';
import { ExtendedChatMessage, ChatResponse } from '@banbury/core/src/types';
import { saveConversation } from "../../../handlers/handleSaveConversation";
import { AlertColor } from "@mui/material";

// Local implementation to avoid import issues
export const extractThinkingContent = (content: string): { thinking?: string; cleanContent: string } => {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/;
  const match = content.match(thinkRegex);

  if (match) {
    // Remove all <think> blocks from the content
    const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return {
      thinking: match[1].trim(),
      cleanContent
    };
  }

  return { cleanContent: content };
};

// Helper function to throttle streaming updates for better performance
const createStreamingThrottle = (callback: (value: string) => void, delay: number = 16) => {
  let lastUpdate = 0;
  let pending = false;
  let latestValue = '';

  return (value: string) => {
    latestValue = value;
    const now = Date.now();
    
    if (now - lastUpdate >= delay) {
      lastUpdate = now;
      flushSync(() => {
        callback(latestValue);
      });
    } else if (!pending) {
      pending = true;
      setTimeout(() => {
        pending = false;
        lastUpdate = Date.now();
        flushSync(() => {
          callback(latestValue);
        });
      }, delay - (now - lastUpdate));
    }
  };
};

export const handleSendMessage = async (
  inputMessage: string, 
  selectedImages: string[], 
  messages: ExtendedChatMessage[], 
  setMessages: React.Dispatch<React.SetStateAction<ExtendedChatMessage[]>>, 
  setInputMessage: (inputMessage: string) => void, 
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>, 
  setIsLoading: (isLoading: boolean) => void, 
  setIsStreaming: (isStreaming: boolean) => void, 
  setStreamingMessage: (streamingMessage: string) => void, 
  setStreamingThinking: (streamingThinking: string) => void, 
  setStreamingToolCalls: (toolCalls: any[]) => void,
  setStreamingToolResults: (toolResults: any[]) => void,
  setIsPreparingToThink: (isPreparingToThink: boolean) => void,
  abortControllerRef: React.MutableRefObject<AbortController | null>, 
  currentModel: string, 
  useWebSearch: boolean, 
  setIsSearching: (isSearching: boolean) => void, 
  showAlert: (title: string, messages: string[], severity: AlertColor) => void, 
  ollamaClient: any, 
  isLoading: boolean,
  currentConversation: any,
  setCurrentConversation: (conversation: any) => void,
  langChainOptions?: {}
) => {
    if ((!inputMessage.trim() && selectedImages.length === 0) || !ollamaClient || isLoading) return;

    // Clean up any existing abort controller before starting a new request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const userMessage: ExtendedChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      images: selectedImages
    };

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();

    // Update UI state
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSelectedImages([]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');
    setStreamingThinking(''); // This will be set to thinking content later
    setStreamingToolCalls([]);
    setStreamingToolResults([]);
    
    // Show immediate thinking indicator for models that support thinking
    flushSync(() => {
      setIsPreparingToThink(true);
    });

    try {

      // Check if we're using Enhanced AI client (has chatStream method)
      if (ollamaClient.chatStream && typeof ollamaClient.chatStream === 'function') {
        // Use Enhanced AI client with streaming callbacks
        const messageHistory = [...messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        let currentMessage = '';
        let activeToolCalls: any[] = [];
        let activeToolResults: any[] = [];

        // Create throttled streaming callbacks for better performance
        const throttledStreamingMessage = createStreamingThrottle(setStreamingMessage, 16);

        // Prepare LangChain options if we're using LangChain client
        const options = langChainOptions || undefined;

        await ollamaClient.chatStream(messageHistory, {
          onToken: (token: string) => {
            if (abortControllerRef.current?.signal.aborted) return;
            // Clear preparing to think state when we get first token
            flushSync(() => {
              setIsPreparingToThink(false);
            });
            currentMessage += token;
            throttledStreamingMessage(currentMessage);
          },
          onThinking: (thinking: string) => {
            if (abortControllerRef.current?.signal.aborted) return;
            // Clear preparing to think state when we get thinking content
            flushSync(() => {
              setIsPreparingToThink(false);
              setStreamingThinking(thinking);
            });
          },
          onThinkingStart: () => {
            if (abortControllerRef.current?.signal.aborted) return;
            flushSync(() => {
              setIsPreparingToThink(false);
            });
          },
          onThinkingEnd: () => {
            if (abortControllerRef.current?.signal.aborted) return;
          },
          onToolCall: (toolCall: any) => {
            if (abortControllerRef.current?.signal.aborted) return;
            activeToolCalls.push(toolCall);
            flushSync(() => {
              setStreamingToolCalls([...activeToolCalls]);
            });
          },
          onToolResult: (result: any) => {
            if (abortControllerRef.current?.signal.aborted) return;
            activeToolResults.push(result);
            flushSync(() => {
              setStreamingToolResults([...activeToolResults]);
            });
            // Keep tool results visible throughout the conversation
          },

          onComplete: (fullResponse: string) => {
            if (abortControllerRef.current?.signal.aborted) return;
            // Keep tool calls visible - don't clear them
            const { thinking, cleanContent } = extractThinkingContent(fullResponse);
            
            // Only create a message if there's actual content or thinking
            if (cleanContent.trim().length > 0 || thinking || activeToolCalls.length > 0) {
              const assistantMessage: ExtendedChatMessage = {
                role: 'assistant',
                content: cleanContent,
                thinking,
                toolCalls: activeToolCalls.length > 0 ? activeToolCalls : undefined,
                toolResults: activeToolResults.length > 0 ? activeToolResults : undefined
              };
              const updatedMessages = [...messages, userMessage, assistantMessage];
              setMessages(updatedMessages);
              saveConversation(updatedMessages, currentConversation, setCurrentConversation);
            }
            
            // Clear streaming states immediately to prevent double rendering
            setStreamingMessage('');
            setStreamingThinking('');
            setStreamingToolCalls([]);
            setStreamingToolResults([]);
            setIsPreparingToThink(false);
            setIsLoading(false);
            setIsStreaming(false);
          },
          onError: (error: Error) => {
            showAlert('Error', ['Failed to send message', error.message], 'error');
          }
        }, options);
        
        return; // Exit early since Enhanced AI client handles everything
      }

      // Fallback to regular Ollama client
      const response = await ollamaClient.chat([...messages, userMessage], {
        stream: true,
        model: currentModel,
        useWebSearch,
        signal: abortControllerRef.current.signal
      });

      // Check if response is an object and has asyncIterator
      if (response && typeof response === 'object' && Symbol.asyncIterator in response) {
        // Handle streaming response
        let completeMessage = '';
        
        // Create throttled updates for fallback streaming
        const throttledFallbackMessage = createStreamingThrottle(setStreamingMessage, 16);
        const immediateFallbackThinking = (thinking: string) => {
          flushSync(() => {
            setStreamingThinking(thinking);
          });
        };
        
        try {
          for await (const chunk of response as AsyncIterable<ChatResponse>) {
            // Check if the request was aborted
            if (abortControllerRef.current?.signal.aborted) {
              break;
            }
            // Clear preparing to think state when we get first chunk
            setIsPreparingToThink(false);
            completeMessage += chunk.message.content;
            const { thinking, cleanContent } = extractThinkingContent(completeMessage);
            throttledFallbackMessage(cleanContent);
            if (thinking) {
              immediateFallbackThinking(thinking);
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          throw error;
        }

        // Only add the message if we weren't aborted
        if (!abortControllerRef.current?.signal.aborted) {
          const { thinking, cleanContent } = extractThinkingContent(completeMessage);
          const assistantMessage: ExtendedChatMessage = {
            role: 'assistant',
            content: cleanContent,
            thinking
          };
          const updatedMessages = [...messages, userMessage, assistantMessage];
          setMessages(updatedMessages);
          saveConversation(updatedMessages, currentConversation, setCurrentConversation);
        }
      } else {
        // Handle non-streaming response (fallback)
        let responseContent = '';
        
        // Check if response is a string (direct content)
        if (typeof response === 'string') {
          responseContent = response;
        } else {
          // Handle object response
          const chatResponse = response as unknown as ChatResponse;
          responseContent = chatResponse.message?.content || '';
        }
        
        const { thinking, cleanContent } = extractThinkingContent(responseContent);
        const assistantMessage: ExtendedChatMessage = {
          role: 'assistant',
          content: cleanContent,
          thinking
        };
        const updatedMessages = [...messages, userMessage, assistantMessage];
        setMessages(updatedMessages);
        saveConversation(updatedMessages, currentConversation, setCurrentConversation);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error sending message:', error);
      showAlert('Error', ['Failed to send message', error instanceof Error ? error.message : 'Unknown error'], 'error');
    } finally {
      // Always clean up states
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessage('');
      setStreamingThinking('');
      setStreamingToolCalls([]);
      setStreamingToolResults([]);
      setIsPreparingToThink(false);
      abortControllerRef.current = null;
    }
  };
