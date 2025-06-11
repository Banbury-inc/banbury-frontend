import React from 'react';
import { ExtendedChatMessage } from '@banbury/core/src/types';
import { saveConversation } from "../../../handlers/handleSaveConversation";
import { AlertColor } from "@mui/material";
import { extractThinkingContent } from './handleSendMessage';
import { Agent } from '@banbury/core/src/ai/agent/agent';
import { LangGraphAgent } from '@banbury/core/src/ai/agent/LangGraphAgent';

export const handleAgent = async (
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
  showAlert: (title: string, messages: string[], severity: AlertColor) => void, 
  aiClient: Agent | LangGraphAgent, 
  isLoading: boolean,
  currentConversation: any,
  setCurrentConversation: (conversation: any) => void,
  mcpClient?: any,
  toolConfig?: any
) => {
  if ((!inputMessage.trim() && selectedImages.length === 0) || !aiClient || isLoading) return;

  if (!mcpClient) {
    showAlert('Error', ['Agent mode requires MCP client for tool access'], 'error');
    return;
  }

  // Clean up any existing abort controller
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  }

  const userMessage: ExtendedChatMessage = {
    role: 'user',
    content: inputMessage.trim(),
    images: selectedImages
  };

  // Update UI state
  setMessages(prev => [...prev, userMessage]);
  setInputMessage('');
  setSelectedImages([]);
  setIsLoading(true);
  setIsStreaming(true);
  setStreamingMessage('');
  setStreamingThinking('');
  setStreamingToolCalls([]);
  setStreamingToolResults([]);
  setIsPreparingToThink(true);

  // Create abort controller
  abortControllerRef.current = new AbortController();

  try {
    // Use the passed client (which could be LangGraphAgent or Agent)
    const agent = aiClient;

    // Convert messages to LangChain format
    const langChainMessages = [...messages, userMessage].map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    let currentStreamingMessage = '';
    let activeToolCalls: any[] = [];
    let activeToolResults: any[] = [];

    // Use LangChain AI client with streaming callbacks
    await agent.chatStream(langChainMessages, {
      onToken: (token: string) => {
        if (abortControllerRef.current?.signal.aborted) return;
        setIsPreparingToThink(false);
        currentStreamingMessage += token;
        setStreamingMessage(currentStreamingMessage);
      },

      onThinking: (thinking: string) => {
        if (abortControllerRef.current?.signal.aborted) return;
        setIsPreparingToThink(false);
        setStreamingThinking(thinking);
      },

      onThinkingStart: () => {
        if (abortControllerRef.current?.signal.aborted) return;
      },

      onThinkingEnd: () => {
        if (abortControllerRef.current?.signal.aborted) return;
      },

      onToolCall: (toolCall: any) => {
        if (abortControllerRef.current?.signal.aborted) return;
        activeToolCalls.push(toolCall);
        setStreamingToolCalls([...activeToolCalls]);
      },

      onToolResult: (result: any) => {
        if (abortControllerRef.current?.signal.aborted) return;
        activeToolResults.push(result);
        setStreamingToolResults([...activeToolResults]);
      },

      onComplete: (fullResponse: string) => {
        if (abortControllerRef.current?.signal.aborted) return;
        
        const { thinking, cleanContent } = extractThinkingContent(fullResponse);
        
        // Create assistant message with all the accumulated data
        const assistantMessage: ExtendedChatMessage = {
          role: 'assistant',
          content: cleanContent || currentStreamingMessage,
          thinking,
          toolCalls: activeToolCalls.length > 0 ? activeToolCalls : undefined,
          toolResults: activeToolResults.length > 0 ? activeToolResults : undefined
        };

        const updatedMessages = [...messages, userMessage, assistantMessage];
        setMessages(updatedMessages);
        saveConversation(updatedMessages, currentConversation, setCurrentConversation);

        setIsPreparingToThink(false);
        setIsLoading(false);
        setIsStreaming(false);
      },

      onError: (error: Error) => {
        showAlert('Agent Error', [error.message], 'error');
      }
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    console.error('LangChain Agent error:', error);
    showAlert('Agent Error', [error instanceof Error ? error.message : 'Unknown error'], 'error');
  } finally {
    // Clean up states
    setIsLoading(false);
    setIsStreaming(false);
    setIsPreparingToThink(false);
    abortControllerRef.current = null;
  }
}; 
