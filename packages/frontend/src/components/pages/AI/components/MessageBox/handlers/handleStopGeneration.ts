import { ExtendedChatMessage } from "@banbury/core/src/types";
import { extractThinkingContent } from "./handleSendMessage";

export const handleStopGeneration = async (
  abortControllerRef: React.MutableRefObject<AbortController | null>, 
  setIsStreaming: (isStreaming: boolean) => void, 
  setIsLoading: (isLoading: boolean) => void, 
  setIsSearching: (isSearching: boolean) => void, 
  streamingMessage: string, messages: ExtendedChatMessage[], setMessages: React.Dispatch<React.SetStateAction<ExtendedChatMessage[]>>, currentConversation: any, setCurrentConversation: (conversation: any) => void, setStreamingMessage: (streamingMessage: string) => void, setStreamingThinking: (streamingThinking: string) => void, setStreamingToolCalls: (toolCalls: any[]) => void, saveConversation: (messages: ExtendedChatMessage[]) => void) => {
    if (abortControllerRef.current) {
      // Abort the current request
      abortControllerRef.current.abort();
      
      // Reset all states immediately
      setIsStreaming(false);
      setIsLoading(false);
      setIsSearching(false);
      
      // Save the partial message if it exists
      if (streamingMessage) {
        const { thinking, cleanContent } = extractThinkingContent(streamingMessage);
        const assistantMessage: ExtendedChatMessage = {
          role: 'assistant',
          content: cleanContent,
          thinking
        };
        const updatedMessages = [...messages, assistantMessage];
        setMessages(updatedMessages);
        saveConversation(updatedMessages);
      }
      
      // Clear streaming states
      setStreamingMessage('');
      setStreamingThinking('');
      setStreamingToolCalls([]);
      
      // Clean up the abort controller
      abortControllerRef.current = null;
    }
  };