import React from 'react';
import { flushSync } from 'react-dom';
import { ExtendedChatMessage } from '@banbury/core/src/types';
import { saveConversation } from "../../../handlers/handleSaveConversation";
import { AlertColor } from "@mui/material";
import { extractThinkingContent } from './handleSendMessage';

// Helper function to analyze tool results and determine if they're satisfactory
const analyzeToolResults = (toolResults: any[]): { needsImprovement: boolean; analysis: string } => {
  if (!toolResults || toolResults.length === 0) {
    return { needsImprovement: true, analysis: "No tool results to analyze - consider using tools to make progress" };
  }

  // Check for common indicators that results might need improvement
  const lastResult = toolResults[toolResults.length - 1];
  const resultContent = JSON.stringify(lastResult).toLowerCase();

  // Look for error indicators
  const errorIndicators = ['error', 'failed', 'not found', 'invalid', 'unauthorized', 'forbidden', 'exception'];
  const hasErrors = errorIndicators.some(indicator => resultContent.includes(indicator));

  // Look for empty or minimal results
  const hasMinimalResults = resultContent.length < 50 || resultContent.includes('[]') || resultContent.includes('null');

  // Look for partial or incomplete results that might need follow-up
  const partialIndicators = ['partial', 'incomplete', 'continue', 'next', 'more', 'additional'];
  const hasPartialResults = partialIndicators.some(indicator => resultContent.includes(indicator));

  if (hasErrors) {
    return { 
      needsImprovement: true, 
      analysis: "Tool results contain errors that need to be addressed with different approach" 
    };
  }

  if (hasMinimalResults) {
    return { 
      needsImprovement: true, 
      analysis: "Tool results appear minimal or empty, try different parameters or approach" 
    };
  }

  if (hasPartialResults) {
    return { 
      needsImprovement: true, 
      analysis: "Tool results appear partial, may need follow-up actions to complete the task" 
    };
  }

  // Be more conservative - assume most results can be built upon
  return { needsImprovement: true, analysis: "Tool results obtained, but task may benefit from additional steps to ensure completeness" };
};

// Create a system message for agent mode iteration
const createAgentIterationMessage = (originalUserMessage: string, toolResults: any[], analysis: string, iterationCount: number): string => {
  return `Continue working step-by-step on: "${originalUserMessage}"

PREVIOUS STEP ANALYSIS: ${analysis}
Current iteration: ${iterationCount}

Previous step results:
${JSON.stringify(toolResults, null, 2)}

NEXT STEP INSTRUCTIONS:
1. Review the previous step's results carefully
2. Identify what still needs to be done to complete the original request
3. Choose ONE specific tool call that makes progress toward the final goal
4. Think of this as step ${iterationCount} in a multi-step process

IMPORTANT CONSTRAINTS:
- You may only make ONE tool call per iteration
- Do NOT declare the task complete unless you have genuinely finished ALL aspects of the user's request
- Each step should build meaningfully on previous steps
- Be thorough and methodical
- Focus on making concrete progress

What is the next logical step to move closer to completing the user's request?`;
};

export const handleAgentMode = async (
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
  setIsSearching: (isSearching: boolean) => void, 
  showAlert: (title: string, messages: string[], severity: AlertColor) => void, 
  ollamaClient: any, 
  isLoading: boolean,
  currentConversation: any,
  setCurrentConversation: (conversation: any) => void,
  langChainOptions?: {},
  maxIterations: number = 5
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

  // Update UI state
  let currentMessages = [...messages, userMessage];
  setMessages(currentMessages);
  setInputMessage('');
  setSelectedImages([]);
  setIsLoading(true);
  setIsStreaming(true);

  let iterationCount = 0;
  let isTaskComplete = false;
  const originalUserMessage = inputMessage.trim();

  while (iterationCount < maxIterations && !isTaskComplete) {
    iterationCount++;
    
    // Create a new AbortController for this iteration
    abortControllerRef.current = new AbortController();
    
    // Show iteration indicator in streaming state only
    flushSync(() => {
      setIsPreparingToThink(true);
      setStreamingMessage(`🤖 Agent Mode - Iteration ${iterationCount}/${maxIterations}`);
      setStreamingThinking('');
      setStreamingToolCalls([]);
      setStreamingToolResults([]);
    });

    try {
      // Check if we're using Enhanced AI client
      if (ollamaClient.chatStream && typeof ollamaClient.chatStream === 'function') {
        const messageHistory = [...currentMessages];
        
        // For iterations beyond the first, add a system message with context
        if (iterationCount > 1) {
          // Get tool results from the last iteration message
          const lastAssistantMessage = currentMessages[currentMessages.length - 1];
          const lastToolResults = lastAssistantMessage?.toolResults || [];
          const analysis = analyzeToolResults(lastToolResults);
          const agentMessage = createAgentIterationMessage(originalUserMessage, lastToolResults, analysis.analysis, iterationCount);
          messageHistory.push({
            role: 'user',
            content: agentMessage
          });
        } else {
          // For the first iteration, add a system message to establish the one tool call constraint
          const firstIterationMessage = `${originalUserMessage}

AGENT MODE: You are operating in agent mode. Break this task down into multiple steps:

STEP-BY-STEP APPROACH:
1. Analyze the user's request and identify what needs to be done
2. Choose ONE specific tool call to make progress on the first part of the task
3. After receiving the tool result, analyze it thoroughly
4. Determine what the next logical step should be
5. IMPORTANT: Do NOT declare the task complete unless you have truly finished ALL aspects of the request

CONSTRAINTS:
- You may only make ONE tool call per iteration
- Think of this as the first step in a multi-step process
- Be methodical and thorough
- Each iteration should make meaningful progress
- Only declare completion when the entire task is genuinely finished

Start with the first logical step toward solving this request.`;
          
          // Replace the original user message with the enhanced version
          messageHistory[messageHistory.length - 1] = {
            role: 'user',
            content: firstIterationMessage,
            images: userMessage.images
          };
        }

        const messageHistoryForAPI = messageHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        let iterationMessage = '';
        let iterationThinking = '';
        let iterationToolCalls: any[] = [];
        let iterationToolResults: any[] = [];
        let hasToolCall = false;

        await ollamaClient.chatStream(messageHistoryForAPI, {
          onToken: (token: string) => {
            if (abortControllerRef.current?.signal.aborted) return;
            
            flushSync(() => {
              setIsPreparingToThink(false);
            });
            
            iterationMessage += token;
            
            flushSync(() => {
              setStreamingMessage(`🤖 Agent Mode - Iteration ${iterationCount}/${maxIterations}\n\n${iterationMessage}`);
            });
          },
          
          onThinking: (thinking: string) => {
            if (abortControllerRef.current?.signal.aborted) return;
            
            flushSync(() => {
              setIsPreparingToThink(false);
            });
            
            iterationThinking = thinking;
            
            flushSync(() => {
              setStreamingThinking(thinking);
            });
          },
          
          onToolCall: (toolCall: any) => {
            if (abortControllerRef.current?.signal.aborted) return;
            
            // Only allow one tool call per iteration
            if (!hasToolCall) {
              hasToolCall = true;
              iterationToolCalls.push(toolCall);
              
              flushSync(() => {
                setStreamingToolCalls([...iterationToolCalls]);
              });
            }
          },
          
          onToolResult: (result: any) => {
            if (abortControllerRef.current?.signal.aborted) return;
            
            // Only process result if we haven't exceeded our tool call limit
            if (iterationToolResults.length === 0) {
              iterationToolResults.push(result);
              
              flushSync(() => {
                setStreamingToolResults([...iterationToolResults]);
              });
            }
          },
          
          onComplete: (fullResponse: string) => {
            if (abortControllerRef.current?.signal.aborted) return;
            
            const { thinking, cleanContent } = extractThinkingContent(fullResponse);
            iterationMessage = cleanContent;
            
            if (thinking) {
              iterationThinking = thinking;
            }
            
            // Create a permanent message bubble for this iteration
            const iterationAssistantMessage: ExtendedChatMessage = {
              role: 'assistant',
              content: `**🤖 Agent Iteration ${iterationCount}/${maxIterations}**\n\n${iterationMessage}`,
              thinking: iterationThinking,
              toolCalls: iterationToolCalls.length > 0 ? iterationToolCalls : undefined,
              toolResults: iterationToolResults.length > 0 ? iterationToolResults : undefined
            };
            
            // Add this iteration as a permanent message
            currentMessages = [...currentMessages, iterationAssistantMessage];
            setMessages(currentMessages);
            
            // Analyze if we should continue iterating
            const responseContent = cleanContent.toLowerCase();
            
            // Only complete if there's an explicit completion statement AND no tools were used, OR very specific completion phrases
            const strongCompletionIndicators = [
              'task is now complete', 'task has been completed successfully', 'final answer:', 'task finished successfully',
              'no further steps needed', 'task completed successfully', 'all requirements have been met'
            ];
            
            const hasStrongCompletion = strongCompletionIndicators.some(indicator => 
              responseContent.includes(indicator)
            );
            
            // Be very conservative about completion - require explicit statements
            if (hasStrongCompletion && iterationCount >= 2) {
              isTaskComplete = true;
            } else if (iterationToolResults.length > 0) {
              // If we have tool results, analyze them but be conservative
              const analysis = analyzeToolResults(iterationToolResults);
              
              // Only complete if the AI explicitly states completion AND we have good results
              const weakCompletionIndicators = ['completed', 'finished', 'done'];
              const hasWeakCompletion = weakCompletionIndicators.some(indicator => 
                responseContent.includes(indicator)
              );
              
              // Require both explicit completion statement AND analysis showing no improvement needed
              isTaskComplete = hasStrongCompletion || (hasWeakCompletion && !analysis.needsImprovement && iterationCount >= 3);
              
              if (!isTaskComplete && iterationCount < maxIterations) {
                // Clear streaming states for next iteration preparation
                flushSync(() => {
                  setStreamingMessage(`🤖 Agent Mode - Preparing iteration ${iterationCount + 1}...`);
                  setStreamingThinking('');
                  setStreamingToolCalls([]);
                  setStreamingToolResults([]);
                });
                return; // Continue to next iteration
              }
            } else {
              // No tool results - encourage using tools unless explicitly stating completion
              if (hasStrongCompletion) {
                isTaskComplete = true;
              } else {
                isTaskComplete = false;
                if (iterationCount < maxIterations) {
                  // Clear streaming states for next iteration preparation
                  flushSync(() => {
                    setStreamingMessage(`🤖 Agent Mode - Preparing iteration ${iterationCount + 1}...`);
                    setStreamingThinking('');
                    setStreamingToolCalls([]);
                    setStreamingToolResults([]);
                  });
                  return; // Continue to next iteration
                }
              }
            }
          },
          
          onError: (error: Error) => {
            console.error(`Agent iteration ${iterationCount} error:`, error);
            showAlert('Agent Error', [`Iteration ${iterationCount} failed`, error.message], 'error');
            isTaskComplete = true; // Stop on error
          }
        }, langChainOptions);
        
      } else {
        // Fallback for non-enhanced clients
        showAlert('Error', ['Agent mode requires Enhanced AI client'], 'error');
        isTaskComplete = true;
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error(`Agent iteration ${iterationCount} error:`, error);
      showAlert('Agent Error', [`Iteration ${iterationCount} failed`, error instanceof Error ? error.message : 'Unknown error'], 'error');
      isTaskComplete = true;
    }
    
    // Add a small delay between iterations to prevent overwhelming the API
    if (!isTaskComplete && iterationCount < maxIterations) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Finalize the agent response
  try {
    // Add a final summary message if we hit max iterations without completion
    if (iterationCount >= maxIterations && !isTaskComplete) {
      const summaryMessage: ExtendedChatMessage = {
        role: 'assistant',
        content: `**🤖 Agent Summary**\n\n*Agent reached maximum iterations (${maxIterations}). The task may need manual refinement or a different approach.*\n\nCompleted ${iterationCount} iterations with various tool calls and analyses. Please review the steps above for insights.`
      };
      
      currentMessages = [...currentMessages, summaryMessage];
      setMessages(currentMessages);
    }
    
    // Save the conversation with all iterations
    saveConversation(currentMessages, currentConversation, setCurrentConversation);
  } catch (error) {
    console.error('Error finalizing agent response:', error);
    showAlert('Error', ['Failed to finalize agent response', error instanceof Error ? error.message : 'Unknown error'], 'error');
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