import React from 'react';
import { ExtendedChatMessage } from '@banbury/core/src/types';
import { saveConversation } from "../../../handlers/handleSaveConversation";
import { AlertColor } from "@mui/material";
import { extractThinkingContent } from './handleSendMessage';

// LangChain-style tool wrapper for MCP tools
class MCPToolWrapper {
  private mcpClient: any;
  private tools: Map<string, any> = new Map();

  constructor(mcpClient: any) {
    this.mcpClient = mcpClient;
    this.initializeTools();
  }

  private async initializeTools() {
    if (!this.mcpClient) return;
    
    try {
      // Get available tools from MCP client
      let availableTools: any[] = [];
      
      // Check if mcpClient has fetchAvailableToolsSafely method
      if (this.mcpClient.fetchAvailableToolsSafely && typeof this.mcpClient.fetchAvailableToolsSafely === 'function') {
        const result = await this.mcpClient.fetchAvailableToolsSafely();
        availableTools = result.tools || [];
        console.log('Available MCP tools:', availableTools.map(t => t.name));
      } else {
        console.log('MCP client does not support fetchAvailableToolsSafely, checking availableTools property');
        // Try to get tools from the state/property if available
        if (this.mcpClient.availableTools && Array.isArray(this.mcpClient.availableTools)) {
          availableTools = this.mcpClient.availableTools.map((name: string) => ({ 
            name, 
            description: `Tool: ${name}` 
          }));
        } else {
          // Fallback: use commonly available Banbury tools and web search
          availableTools = [
            { name: 'banbury-get-scanned-folders', description: 'Get scanned folders for a device' },
            { name: 'banbury-get-files', description: 'Get files from the system' },
            { name: 'banbury-get-random-files', description: 'Get random files from the system' },
            { name: 'banbury-get-sessions', description: 'Get session information' },
            { name: 'banbury-add-task', description: 'Add a task to the system' },
            { name: 'get-joke', description: 'Get a random joke' },
            { name: 'web_search', description: 'Search the web for current information' }
          ];
        }
      }
      
      console.log('Initializing tools:', availableTools.map(tool => tool.name));
      
      // Wrap each MCP tool in LangChain-compatible format
      for (const tool of availableTools) {
        this.tools.set(tool.name, {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema || {},
          execute: async (args: any) => {
            // Use callTool method from MCP client
            if (this.mcpClient.callTool && typeof this.mcpClient.callTool === 'function') {
              const result = await this.mcpClient.callTool({ tool: tool.name, parameters: args });
              return result.content ? result.content.map((c: any) => c.text).join('\n') : result;
            } else {
              throw new Error(`MCP client does not support callTool method`);
            }
          }
        });
      }
      
      console.log('Initialized tools for LangChain agent:', Array.from(this.tools.keys()));
    } catch (error) {
      console.error('Failed to initialize MCP tools:', error);
    }
  }

  getTools() {
    return Array.from(this.tools.values());
  }

  async callTool(toolName: string, args: any) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      const availableTools = Array.from(this.tools.keys()).join(', ');
      throw new Error(`Tool "${toolName}" not found. Available tools: ${availableTools}`);
    }
    return await tool.execute(args);
  }
}

// Simple LangChain-style Agent Executor
class SimpleAgentExecutor {
  private ollamaClient: any;
  private toolWrapper: MCPToolWrapper;
  private maxIterations: number;
  private currentIteration: number = 0;
  private messages: ExtendedChatMessage[] = [];
  private isRunning: boolean = false;

  // Streaming callbacks
  private onIterationStart?: (iteration: number) => void;
  private onToolCall?: (toolName: string, args: any) => void;
  private onToolResult?: (toolName: string, result: any) => void;
  private onThinking?: (thinking: string) => void;
  private onToken?: (token: string) => void;
  private onIterationComplete?: (iteration: number, result: string, thinking?: string, toolCalls?: any[], toolResults?: any[]) => void;
  private onAgentComplete?: (finalResult: string) => void;
  private onError?: (error: Error) => void;

  constructor(
    ollamaClient: any, 
    mcpClient: any, 
    maxIterations: number = 5,
    callbacks: {
      onIterationStart?: (iteration: number) => void;
      onToolCall?: (toolName: string, args: any) => void;
      onToolResult?: (toolName: string, result: any) => void;
      onThinking?: (thinking: string) => void;
      onToken?: (token: string) => void;
      onIterationComplete?: (iteration: number, result: string, thinking?: string, toolCalls?: any[], toolResults?: any[]) => void;
      onAgentComplete?: (finalResult: string) => void;
      onError?: (error: Error) => void;
    } = {}
  ) {
    this.ollamaClient = ollamaClient;
    this.toolWrapper = new MCPToolWrapper(mcpClient);
    this.maxIterations = maxIterations;
    
    // Set up callbacks
    this.onIterationStart = callbacks.onIterationStart;
    this.onToolCall = callbacks.onToolCall;
    this.onToolResult = callbacks.onToolResult;
    this.onThinking = callbacks.onThinking;
    this.onToken = callbacks.onToken;
    this.onIterationComplete = callbacks.onIterationComplete;
    this.onAgentComplete = callbacks.onAgentComplete;
    this.onError = callbacks.onError;
  }

  private createAgentPrompt(userMessage: string, _conversationHistory: ExtendedChatMessage[]): string {
    const tools = this.toolWrapper.getTools();
    const toolDescriptions = tools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    return `You are a LangChain-powered AI agent working with the Banbury system. You help users accomplish tasks by using available tools step-by-step, similar to how Cursor's Agent Mode works.

AVAILABLE TOOLS:
${toolDescriptions}

USER REQUEST: ${userMessage}

CORE PRINCIPLES:
- Break complex tasks into logical steps
- Use ONE tool per iteration to make progress
- After each tool use, EVALUATE the results thoroughly
- Analyze what the results tell you about progress toward the goal
- Be methodical and thorough like a human developer
- Continue iterating until the task is fully complete
- Provide clear reasoning for each step

WORKFLOW:
1. Plan: Understand the user's request and identify what needs to be done
2. Act: Choose and execute the most appropriate tool for the current step
3. Evaluate: Analyze the tool results - what did you learn? What does this mean?
4. Decide: Based on the evaluation, determine the next action needed
5. Repeat until complete

AFTER EACH TOOL USE:
- Explain what the tool results show
- Assess whether the results are helpful/sufficient
- Identify what information is still needed
- Plan the next logical step based on what you learned

IMPORTANT:
- Only call ONE tool at a time
- Always evaluate tool results before proceeding
- Think step-by-step like Cursor's agent mode
- Don't rush to completion - be thorough in your analysis
- Show your reasoning about what the results mean

When you need to use a tool, the system will handle the tool call automatically.
When you're completely finished with all necessary steps, clearly state that the task is complete.

Begin your step-by-step approach to: ${userMessage}`;
  }

  async run(userMessage: string, conversationHistory: ExtendedChatMessage[] = []): Promise<string> {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }

    this.isRunning = true;
    this.currentIteration = 0;
    this.messages = [...conversationHistory];

    try {
      const agentPrompt = this.createAgentPrompt(userMessage, conversationHistory);
      let currentContext = agentPrompt;
      let finalResult = '';

      while (this.currentIteration < this.maxIterations && this.isRunning) {
        this.currentIteration++;
        this.onIterationStart?.(this.currentIteration);

        try {
          const iterationResult = await this.runIteration(currentContext);
          
          if (iterationResult.isFinal) {
            finalResult = iterationResult.content;
            this.onAgentComplete?.(finalResult);
            break;
          } else {
            // Add this iteration's context with evaluation prompt for the next iteration
            if (iterationResult.hadToolCall) {
              currentContext += `\n\nIteration ${this.currentIteration} complete. 

Tool used: ${iterationResult.action}
Tool results: ${iterationResult.toolResults}

EVALUATION REQUIRED: Now analyze these results:
1. What did the tool results reveal?
2. How do these results help with the user's request?
3. What information is still needed?
4. What should be the next logical step?

Based on your evaluation, either use another tool or provide your final answer if the task is complete.`;
            } else {
              currentContext += `\n\nIteration ${this.currentIteration} complete. Previous response: ${iterationResult.content}\n\nContinue with your next step to complete the user's request.`;
            }
          }
        } catch (error) {
          this.onError?.(error as Error);
          throw error;
        }
      }

      if (this.currentIteration >= this.maxIterations && !finalResult) {
        finalResult = `Agent reached maximum iterations (${this.maxIterations}). The task may need to be broken down further or approached differently.`;
      }

      return finalResult;
    } finally {
      this.isRunning = false;
    }
  }

  private async runIteration(context: string): Promise<{ content: string; action: string; isFinal: boolean; hadToolCall: boolean; toolResults?: string }> {
    if (!this.ollamaClient.chatStream) {
      throw new Error('Agent mode requires Enhanced AI client with streaming support');
    }

    return new Promise((resolve, reject) => {
      let thinkingContent = '';
      let iterationToolCalls: any[] = [];
      let iterationToolResults: any[] = [];
      let hasToolCall = false;

      this.ollamaClient.chatStream([{ role: 'user', content: context }], {
        onToken: (_token: string) => {
          // Token streaming handled by the callback
          this.onToken?.(_token);
        },

        onThinking: (thinking: string) => {
          thinkingContent = thinking;
          this.onThinking?.(thinking);
        },

        onToolCall: async (toolCall: any) => {
          if (hasToolCall) return; // Limit to one tool call per iteration
          
          hasToolCall = true;
          iterationToolCalls.push(toolCall);
          this.onToolCall?.(toolCall.function.name, toolCall.function.arguments);

          try {
            // Execute the tool call
            const args = JSON.parse(toolCall.function.arguments);
            const result = await this.toolWrapper.callTool(toolCall.function.name, args);
            
            iterationToolResults.push({
              success: true,
              content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }],
              tool: toolCall.function.name,
              args: args
            });

            this.onToolResult?.(toolCall.function.name, result);
          } catch (error) {
            const errorResult = {
              success: false,
              content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              error: error instanceof Error ? error.message : 'Unknown error',
              tool: toolCall.function.name,
              args: toolCall.function.arguments
            };
            
            iterationToolResults.push(errorResult);
            this.onToolResult?.(toolCall.function.name, errorResult);
          }
        },

        onComplete: (fullResponse: string) => {
          const { thinking, cleanContent } = extractThinkingContent(fullResponse);
          
          if (thinking) {
            thinkingContent = thinking;
          }

          // Check if this is a final answer - be more natural about completion detection
          const completionPhrases = [
            'task is complete',
            'task completed',
            'finished',
            'done',
            'task has been completed',
            'successfully completed',
            'all steps completed',
            'final answer',
            'final result',
            'conclusion'
          ];
          
          const isFinalAnswer = completionPhrases.some(phrase => 
            cleanContent.toLowerCase().includes(phrase)
          ) || !iterationToolCalls.length && this.currentIteration >= 2; // No tool calls after 2+ iterations usually means done

          let finalContent = cleanContent;

          this.onIterationComplete?.(
            this.currentIteration, 
            finalContent, 
            thinkingContent, 
            iterationToolCalls, 
            iterationToolResults
          );

          const hadToolCall = iterationToolCalls.length > 0;
          const action = hadToolCall 
            ? `${iterationToolCalls[0].function.name}`
            : 'Analyzed and responded';

          const toolResults = hadToolCall && iterationToolResults.length > 0
            ? iterationToolResults.map(r => {
                if (r.success && r.content && r.content.length > 0) {
                  return r.content.map((c: any) => c.text).join('\n');
                } else if (r.error) {
                  return `Error: ${r.error}`;
                } else {
                  return JSON.stringify(r);
                }
              }).join('\n')
            : undefined;

          resolve({
            content: finalContent,
            action: action,
            isFinal: isFinalAnswer,
            hadToolCall: hadToolCall,
            toolResults: toolResults
          });
        },

        onError: (error: Error) => {
          this.onError?.(error);
          reject(error);
        }
      });
    });
  }

  stop() {
    this.isRunning = false;
  }
}

export const handleLangChainAgent = async (
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
  mcpClient?: any
) => {
  if ((!inputMessage.trim() && selectedImages.length === 0) || !ollamaClient || isLoading) return;

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
  let currentMessages = [...messages, userMessage];
  setMessages(currentMessages);
  setInputMessage('');
  setSelectedImages([]);
  setIsLoading(true);
  setIsStreaming(true);

  // Create abort controller
  abortControllerRef.current = new AbortController();

  try {
    // Create throttling mechanism to prevent rapid updates
    let lastThinkingUpdate = 0;
    let lastThinkingContent = '';
    
    // Create the LangChain-style agent
    const agent = new SimpleAgentExecutor(ollamaClient, mcpClient, 5, {
            onIterationStart: (iteration: number) => {
        setIsPreparingToThink(true);
        setStreamingMessage(`🤖 LangChain Agent - Step ${iteration}/5`);
        setStreamingThinking('');
        setStreamingToolCalls([]);
        setStreamingToolResults([]);
      },

      onToken: (_token: string) => {
        if (abortControllerRef.current?.signal.aborted) return;
        setIsPreparingToThink(false);
        // Update streaming message with current content
        // This will be replaced when iteration completes
      },

      onThinking: (thinking: string) => {
        if (abortControllerRef.current?.signal.aborted) return;
        
        // Throttle thinking updates to prevent rapid re-renders
        const now = Date.now();
        if (thinking !== lastThinkingContent && now - lastThinkingUpdate > 100) {
          lastThinkingUpdate = now;
          lastThinkingContent = thinking;
          setIsPreparingToThink(false);
          setStreamingThinking(thinking);
        }
      },

      onToolCall: (toolName: string, args: any) => {
        if (abortControllerRef.current?.signal.aborted) return;
        setStreamingToolCalls([{ function: { name: toolName, arguments: JSON.stringify(args) } }]);
      },

      onToolResult: (toolName: string, result: any) => {
        if (abortControllerRef.current?.signal.aborted) return;
        setStreamingToolResults([{ 
          success: true, 
          content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }],
          tool: toolName 
        }]);
      },

      onIterationComplete: (iteration: number, result: string, thinking?: string, toolCalls?: any[], toolResults?: any[]) => {
        if (abortControllerRef.current?.signal.aborted) return;

        // Create a permanent message bubble for this iteration
        const iterationMessage: ExtendedChatMessage = {
          role: 'assistant',
          content: `**🤖 LangChain Agent - Step ${iteration}/5**\n\n${result}`,
          thinking: thinking,
          toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
          toolResults: toolResults && toolResults.length > 0 ? toolResults : undefined
        };

        currentMessages = [...currentMessages, iterationMessage];
        setMessages(currentMessages);

        // Clear streaming states for next iteration
        setStreamingMessage('');
        setStreamingThinking('');
        setStreamingToolCalls([]);
        setStreamingToolResults([]);
      },

      onAgentComplete: (finalResult: string) => {
        if (abortControllerRef.current?.signal.aborted) return;
        
        // Create final summary message if needed
        const summaryMessage: ExtendedChatMessage = {
          role: 'assistant',
          content: `**🎯 Task Completed**\n\n${finalResult}`
        };

        currentMessages = [...currentMessages, summaryMessage];
        setMessages(currentMessages);
        saveConversation(currentMessages, currentConversation, setCurrentConversation);
      },

      onError: (error: Error) => {
        showAlert('Agent Error', [error.message], 'error');
      }
    });

    // Run the agent
    await agent.run(inputMessage.trim(), messages);

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
    setStreamingMessage('');
    setStreamingThinking('');
    setStreamingToolCalls([]);
    setStreamingToolResults([]);
    setIsPreparingToThink(false);
    abortControllerRef.current = null;
  }
}; 