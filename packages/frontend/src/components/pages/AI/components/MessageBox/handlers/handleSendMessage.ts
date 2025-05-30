import React from 'react';
import { ExtendedChatMessage, ChatResponse } from '@banbury/core/src/types';
import { saveConversation } from "../../../handlers/handleSaveConversation";
import { AlertColor } from "@mui/material";
import { WebSearchService, WebSearchResult } from '@banbury/core/src/ai/web-search';

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
  abortControllerRef: React.MutableRefObject<AbortController | null>, 
  currentModel: string, 
  useWebSearch: boolean, 
  setIsSearching: (isSearching: boolean) => void, 
  showAlert: (title: string, messages: string[], severity: AlertColor) => void, 
  ollamaClient: any, 
  isLoading: boolean,
  currentConversation: any,
  setCurrentConversation: (conversation: any) => void
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
    setStreamingThinking('');

    try {
      if (useWebSearch) {
        setIsSearching(true);
        const startTime = Date.now();
        // Modify the user's message to include web search results
        const webSearchService = new WebSearchService();
        const searchResults = await webSearchService.search(inputMessage.trim());
        const duration = ((Date.now() - startTime) / 1000);
        setIsSearching(false);
        
        // Format search results into a context string
        const searchContext = searchResults.map((result: WebSearchResult) => 
          `[${result.title}]\n${result.snippet}\nSource: ${result.link}`
        ).join('\n\n');

        // Add search results and duration as context to the user message
        userMessage.content = `<context>${searchContext}</context>\n${inputMessage.trim()}`;
        userMessage.searchInfo = { duration: parseFloat(duration.toFixed(1)) };
      }

      const response = await ollamaClient.chat([...messages, userMessage], {
        stream: true,
        model: currentModel,
        useWebSearch,
        signal: abortControllerRef.current.signal
      });

      if (Symbol.asyncIterator in response) {
        // Handle streaming response
        let completeMessage = '';
        try {
          for await (const chunk of response as AsyncIterable<ChatResponse>) {
            // Check if the request was aborted
            if (abortControllerRef.current?.signal.aborted) {
              break;
            }
            completeMessage += chunk.message.content;
            const { thinking, cleanContent } = extractThinkingContent(completeMessage);
            setStreamingMessage(cleanContent);
            if (thinking) {
              setStreamingThinking(thinking);
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
        const chatResponse = response as unknown as ChatResponse;
        const { thinking, cleanContent } = extractThinkingContent(chatResponse.message.content);
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
      abortControllerRef.current = null;
    }
  };
