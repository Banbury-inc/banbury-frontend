import React from 'react';
import { ExtendedChatMessage } from '@banbury/core/src/types';
import { saveConversation } from "../../../handlers/handleSaveConversation";
import { AlertColor } from "@mui/material";
import { extractThinkingContent } from './handleSendMessage';

// Unified tool wrapper for multiple tool sources
class UnifiedToolWrapper {
  private mcpClient: any;
  private ollamaClient: any;
  private tools: Map<string, any> = new Map();

  constructor(mcpClient: any, ollamaClient?: any) {
    this.mcpClient = mcpClient;
    this.ollamaClient = ollamaClient;
    this.initializeTools();
  }

  private async initializeTools() {
    try {
      // Initialize tools from multiple sources
      await this.initializeMcpTools();
      await this.initializeBuiltInTools();
      
    } catch (error) {
      console.error('Failed to initialize unified tools:', error);
    }
  }

  private async initializeMcpTools() {
    if (!this.mcpClient) return;
    
    try {
      // Get available tools from MCP client
      let availableTools: any[] = [];
      
      // Check if mcpClient has fetchAvailableToolsSafely method
      if (this.mcpClient.fetchAvailableToolsSafely && typeof this.mcpClient.fetchAvailableToolsSafely === 'function') {
        const result = await this.mcpClient.fetchAvailableToolsSafely();
        availableTools = result.tools || [];
      } else {
        // Try to get tools from the state/property if available
        if (this.mcpClient.availableTools && Array.isArray(this.mcpClient.availableTools)) {
          availableTools = this.mcpClient.availableTools.map((name: string) => ({ 
            name, 
            description: `Tool: ${name}` 
          }));
        } else {
          // Fallback: use commonly available Banbury tools
          availableTools = [
            { name: 'add', description: 'Add two numbers' },
            { name: 'get-joke', description: 'Get a random joke' },
            { name: 'banbury-login', description: 'Login to Banbury system' },
            { name: 'banbury-get-device-info', description: 'Get device information' },
            { name: 'banbury-get-scanned-folders', description: 'Get scanned folders for a device' },
            { name: 'banbury-get-files', description: 'Get files from the system' },
            { name: 'banbury-get-random-files', description: 'Get random files from the system' },
            { name: 'banbury-add-task', description: 'Add a task to the system' },
            { name: 'banbury-get-sessions', description: 'Get session information' },
            { name: 'banbury-add-model', description: 'Add a model to a device' },
            { name: 'banbury-update-device', description: 'Update device information' },
            { name: 'banbury-declare-online', description: 'Declare device as online' }
          ];
        }
      }
      
      // Wrap each MCP tool in unified format
      for (const tool of availableTools) {
        this.tools.set(tool.name, {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema || {},
          source: 'mcp',
          execute: async (args: any) => {
            return await this.executeMcpTool(tool.name, args);
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize MCP tools:', error);
    }
  }

  private async initializeBuiltInTools() {
    // Add built-in tools that are handled by other clients
    const builtInTools = [
      { 
        name: 'web_search', 
        description: 'Search the web for current information',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum number of results', default: 5 }
          },
          required: ['query']
        }
      }
    ];

    for (const tool of builtInTools) {
      this.tools.set(tool.name, {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        source: 'builtin',
        execute: async (args: any) => {
          return await this.executeBuiltInTool(tool.name, args);
        }
      });
    }

  }

  private async executeMcpTool(toolName: string, args: any): Promise<any> {
    if (!this.mcpClient?.callTool) {
      throw new Error(`MCP client does not support callTool method`);
    }

    const result = await this.mcpClient.callTool({ tool: toolName, parameters: args });
    
    // Return structured MCP result if available, otherwise wrap the response
    if (result && typeof result === 'object' && 'success' in result) {
      return result;
    } else {
      // Wrap in success structure
      return {
        success: true,
        content: result.content ? result.content : [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }]
      };
    }
  }

  private async executeBuiltInTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'web_search':
        return await this.executeWebSearch(args);
      default:
        throw new Error(`Unknown built-in tool: ${toolName}`);
    }
  }

  private async executeWebSearch(args: any): Promise<any> {
    const query = args.query || args.search_term || '';
    const maxResults = args.maxResults || args.max_results || 5;
    
    if (!query) {
      return {
        success: false,
        content: [{ type: 'text', text: 'Search query is required' }],
        error: 'Search query is required'
      };
    }
    
    try {
      // Use the Enhanced AI client's built-in web search if available
      if (this.ollamaClient?.webSearchService) {
        const searchResults = await this.ollamaClient.webSearchService.search(query, maxResults);
        const resultText = searchResults.map((result: any) => 
          `**${result.title}**\n${result.snippet}\nSource: ${result.link}`
        ).join('\n\n');
        
        return {
          success: true,
          content: [{ type: 'text', text: `Web search results for "${query}":\n\n${resultText}` }]
        };
      } 
      // Try using MCP client as fallback for web_search
      else if (this.mcpClient?.callTool) {
        const result = await this.mcpClient.callTool({ tool: 'web_search', parameters: args });
        return result;
      }
      else {
        // Return success with informational message if no actual search capability
        return {
          success: true,
          content: [{ type: 'text', text: `Web search request received for query: "${query}". Search capability is not fully configured but tool call was successful.` }]
        };
      }
    } catch (error) {
      console.error('UnifiedToolWrapper: Web search error:', error);
      return {
        success: false,
        content: [{ type: 'text', text: `Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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

  // Method to add custom tools from other sources
  addCustomTool(name: string, description: string, execute: (args: any) => Promise<any>, parameters?: any) {
    this.tools.set(name, {
      name,
      description,
      parameters: parameters || {},
      source: 'custom',
      execute
    });
  }

  // Method to get tool information including source
  getToolInfo(toolName: string) {
    const tool = this.tools.get(toolName);
    if (!tool) return null;
    
    return {
      name: tool.name,
      description: tool.description,
      source: tool.source,
      parameters: tool.parameters
    };
  }

  // List all tools by source
  getToolsBySource(source: string) {
    return Array.from(this.tools.values()).filter((tool: any) => tool.source === source);
  }
}

// Simple LangChain-style Agent Executor
class SimpleAgentExecutor {
  private ollamaClient: any;
  private toolWrapper: UnifiedToolWrapper;
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
    this.toolWrapper = new UnifiedToolWrapper(mcpClient, ollamaClient);
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
            
            // The unified tool wrapper should return structured MCP results
            let structuredResult;
            if (result && typeof result === 'object' && 'success' in result) {
              // Already a structured MCP result
              structuredResult = {
                ...result,
                tool: toolCall.function.name,
                args: args
              };
            } else {
              // Fallback: wrap raw result in success structure
              structuredResult = {
                success: true,
                content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }],
                tool: toolCall.function.name,
                args: args
              };
            }
            
            iterationToolResults.push(structuredResult);
            this.onToolResult?.(toolCall.function.name, structuredResult);
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
  showAlert: (title: string, messages: string[], severity: AlertColor) => void, 
  ollamaClient: any, 
  isLoading: boolean,
  currentConversation: any,
  setCurrentConversation: (conversation: any) => void,
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
    const agent = new SimpleAgentExecutor(ollamaClient, mcpClient, 50, {
            onIterationStart: () => {
        setIsPreparingToThink(true);
        setStreamingMessage(``);
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
        
        // Handle structured MCP result vs raw result
        let toolResult;
        if (result && typeof result === 'object' && 'success' in result) {
          // Already a structured MCP result - use it directly
          toolResult = result;
        } else {
          toolResult = { 
            success: true, 
            content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }],
            tool: toolName 
          };
        }
        
        setStreamingToolResults([toolResult]);
      },

      onIterationComplete: (iteration: number, result: string, thinking?: string, toolCalls?: any[], toolResults?: any[]) => {
        if (abortControllerRef.current?.signal.aborted) return;

        // Create a permanent message bubble for this iteration
        const iterationMessage: ExtendedChatMessage = {
          role: 'assistant',
          content: result,
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
          content: finalResult
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
