import { OllamaClient } from './index';
import { BanburyMcpClient, McpToolCall, McpToolResult } from './tools/BanburyMcpClient';
import { WebSearchService } from './web-search';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface StreamCallback {
  onToken?: (token: string) => void;
  onThinking?: (thinking: string) => void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (result: McpToolResult) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Basic AI Client that combines Ollama with MCP tool calling capabilities
 */
export class BasicClient {
  private ollamaClient: OllamaClient;
  private mcpClient: BanburyMcpClient | null;
  private webSearchService: WebSearchService;
  private systemPrompt: string | null = null;
  private currentModel: string;
  private executedToolCalls: Set<string> = new Set(); // Track executed tool calls
  private webSearchEnabled: boolean = false;

  constructor(
    ollamaBaseUrl: string = 'http://localhost:11434',
    model: string = 'qwen3:latest',
    mcpClient: BanburyMcpClient | null = null
  ) {
    this.ollamaClient = new OllamaClient(ollamaBaseUrl, model);
    this.mcpClient = mcpClient;
    this.webSearchService = new WebSearchService();
    this.currentModel = model;
  }

  /**
   * Enable or disable web search functionality
   */
  public setWebSearchEnabled(enabled: boolean) {
    this.webSearchEnabled = enabled;
    this.systemPrompt = null; // Will be rebuilt on next getSystemPrompt()
  }

  /**
   * Build system prompt that includes MCP tool instructions (async)
   */
  private async buildSystemPrompt(): Promise<string> {
    const basePrompt = `You are Banbury AI, an intelligent assistant with access to the Banbury system and its tools.`;
    
    let toolsPrompt = '';
    
    // Add web search tool if enabled
    if (this.webSearchEnabled) {
      toolsPrompt += `
**Web Search Tool:**
- **web_search**: Search the web for current information, news, facts, or any query that requires up-to-date information
  Example parameters:
  \`\`\`json
  {
    "query": "search query here",
    "maxResults": 5
  }
  \`\`\`

**When to use web search:**
- User asks for current news, events, or recent information
- Questions about current stock prices, weather, sports scores
- Any query that requires real-time or recent data
- When your knowledge might be outdated

`;
    }
    
    if (!this.mcpClient && !this.webSearchEnabled) {
      return basePrompt;
    }
    
    let availableTools: any[] = [];
    if (this.mcpClient) {
      const result = await this.mcpClient.fetchAvailableToolsSafely();
      availableTools = result.tools;
      if (result.error) {
        toolsPrompt += '\n\n(Note: MCP tools unavailable - continuing without tool support.)';
      }
    }
    
    // Generate tool usage examples from inputSchema
    const toolDetails = availableTools.map(tool => {
      let paramExample = '{}';
      if (tool.inputSchema && tool.inputSchema.properties) {
        const props = tool.inputSchema.properties;
        const required = tool.inputSchema.required || [];
        const exampleObj: Record<string, any> = {};
        
        // Filter out authentication/system parameters that are handled automatically
        const userParameters = Object.keys(props).filter(key => 
          !['token', 'environment', 'apiKey'].includes(key)
        );
        
        for (const key of userParameters) {
          const type = props[key].type;
          const description = props[key].description || '';
          
          // Skip if this is auto-provided
          if (description.toLowerCase().includes('optional') && key === 'device_name') {
            continue; // Don't include optional device_name in examples
          }
          
          if (type === 'string') {
            exampleObj[key] = required.includes(key) ? `${key}_value` : '';
          } else if (type === 'integer' || type === 'number') {
            exampleObj[key] = required.includes(key) ? 1 : 0;
          } else if (type === 'boolean') {
            exampleObj[key] = false;
          } else {
            exampleObj[key] = null;
          }
        }
        
        // Only show parameters if there are user-facing ones
        if (Object.keys(exampleObj).length > 0) {
          paramExample = JSON.stringify(exampleObj, null, 2);
        }
      }
      
      // Add special note for banbury tools about auto-authentication
      const authNote = tool.name.startsWith('banbury-') 
        ? '\n  **Authentication**: Handled automatically - no token required'
        : '';
      
      // Add device auto-detection note for relevant tools
      const deviceNote = tool.name.includes('device') || tool.name.includes('scanned-folders')
        ? '\n  **Device**: Will auto-detect your device if not specified'
        : '';
      
      return `- **${tool.name}**: ${tool.description || ''}${authNote}${deviceNote}\n  Example parameters:\n  \`\`\`json\n${paramExample}\n\`\`\``;
    }).join('\n\n');
    
    let finalPrompt = basePrompt;
    
    if (toolsPrompt || toolDetails) {
      finalPrompt += '\nYou have access to the following tools:';
      
      if (toolsPrompt) {
        finalPrompt += '\n' + toolsPrompt;
      }
      
      if (toolDetails) {
        finalPrompt += `\n**Banbury MCP Tools:**\n**IMPORTANT**: For Banbury tools, authentication and environment are handled automatically. You don't need to ask users for tokens or environment details.\n\n**Available Tools and Usage Examples:**\n${toolDetails}`;
      }
      
      finalPrompt += `\n\n**CRITICAL: Tool Usage Instructions**\nWhen you need to use a tool, you MUST format your request using this EXACT format:\n\n\`\`\`mcp-tool\n{\n  "tool": "tool_name",\n  "parameters": { /* only user-facing parameters */ }\n}\n\`\`\`\n\n**IMPORTANT**: \n- Authentication (tokens, environment) is handled automatically for Banbury tools\n- Device names are auto-detected when possible\n- Only ask users for the essential parameters they control (like task descriptions, file paths, etc.)\n- You MUST use the exact \`\`\`mcp-tool code block format above\n- For web search, use {"query": "search terms", "maxResults": 5}\n\n**Common Usage Examples:**\n- User says "get scanned folders" → Use banbury-get-scanned-folders with empty parameters {}\n- User says "add task to process files" → Use banbury-add-task with {"task_description": "process files"}\n- User says "get device info" → Use banbury-get-device-info (will auto-detect device)\n- User asks "latest NFL news" → Use web_search with {"query": "latest NFL news", "maxResults": 5}\n\nAlways explain what you're doing before calling tools, and interpret the results for the user in a helpful way.`;
    }
    
    return finalPrompt;
  }

  /**
   * Get the system prompt, initializing it if needed
   */
  public async getSystemPrompt(): Promise<string> {
    if (!this.systemPrompt) {
      this.systemPrompt = await this.buildSystemPrompt();
    }
    return this.systemPrompt;
  }

  /**
   * Update the MCP client
   */
  public setMcpClient(mcpClient: BanburyMcpClient | null) {
    this.mcpClient = mcpClient;
    this.systemPrompt = null; // Will be rebuilt on next getSystemPrompt()
  }

  /**
   * Set the Ollama model
   */
  public setModel(model: string) {
    this.currentModel = model;
    // Recreate the Ollama client with the new model
    this.ollamaClient = new OllamaClient('http://localhost:11434', model);
  }

  /**
   * Process thinking content for real-time streaming
   */
  private processThinkingContent(
    fullResponse: string, 
    token: string, 
    currentThinkingContent: string, 
    isInThinking: boolean
  ): {
    isInThinking: boolean;
    currentThinkingContent: string;
    visibleContent: string;
    newThinkingContent?: string;
    newVisibleContent?: string;
  } {
    let newThinkingContent: string | undefined;
    let newVisibleContent: string | undefined;
    
    // Check if this token contains the start of a thinking block
    if (!isInThinking && token.includes('<think')) {
      isInThinking = true;
      // Find where the thinking starts in this token
      const thinkStartMatch = token.match(/<think(?:ing)?>/);
      if (thinkStartMatch) {
        const beforeThink = token.substring(0, thinkStartMatch.index!);
        const afterThink = token.substring(thinkStartMatch.index! + thinkStartMatch[0].length);
        
        // Send any content before the thinking tag as visible
        if (beforeThink) {
          newVisibleContent = beforeThink;
        }
        
        // Check if this token also contains the end of thinking
        if (afterThink.includes('</think')) {
          const endMatch = afterThink.match(/<\/think(?:ing)?>/);
          if (endMatch) {
            // Complete thinking block in this single token
            const thinkingContent = afterThink.substring(0, endMatch.index!);
            newThinkingContent = thinkingContent;
            isInThinking = false;
            
            // Any content after the closing tag is visible
            const afterEnd = afterThink.substring(endMatch.index! + endMatch[0].length);
            if (afterEnd) {
              newVisibleContent = (newVisibleContent || '') + afterEnd;
            }
          } else {
            // Start of thinking, accumulate
            currentThinkingContent = afterThink;
            newThinkingContent = currentThinkingContent;
          }
        } else {
          // Start of thinking, accumulate
          currentThinkingContent = afterThink;
          newThinkingContent = currentThinkingContent;
        }
      }
    } else if (isInThinking) {
      // We're in thinking mode, check if this token ends it
      if (token.includes('</think')) {
        const endMatch = token.match(/<\/think(?:ing)?>/);
        if (endMatch) {
          // End of thinking
          const beforeTag = token.substring(0, endMatch.index!);
          currentThinkingContent += beforeTag;
          newThinkingContent = currentThinkingContent;
          isInThinking = false;
          
          // Any content after the closing tag is visible
          const afterTag = token.substring(endMatch.index! + endMatch[0].length);
          if (afterTag) {
            newVisibleContent = afterTag;
          }
          
          // Reset thinking content for next block
          currentThinkingContent = '';
        } else {
          // Still in thinking, accumulate content
          currentThinkingContent += token;
          newThinkingContent = currentThinkingContent;
        }
      } else {
        // Still in thinking, accumulate content
        currentThinkingContent += token;
        newThinkingContent = currentThinkingContent;
      }
    } else {
      // Not in thinking, this is visible content
      newVisibleContent = token;
    }
    
    // Calculate visible content by removing all thinking blocks
    const visibleContent = fullResponse.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/g, '').trim();
    
    return {
      isInThinking,
      currentThinkingContent,
      visibleContent,
      newThinkingContent,
      newVisibleContent
    };
  }

  /**
   * Extract complete thinking content from response
   */
  private extractCompleteThinking(response: string): string {
    const thinkingMatches = response.match(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/g);
    if (thinkingMatches) {
      return thinkingMatches.map(match => 
        match.replace(/<\/?think(?:ing)?>/g, '')
      ).join('\n').trim();
    }
    return '';
  }

  /**
   * Chat with streaming response and tool calling
   */
  public async chatStream(
    messages: AIMessage[],
    callbacks: StreamCallback = {}
  ): Promise<string> {
    try {
      this.executedToolCalls.clear();
      // Add system prompt if not present
      let messagesWithSystem;
      if (messages[0]?.role === 'system') {
        messagesWithSystem = messages;
      } else {
        const prompt = await this.getSystemPrompt();
        messagesWithSystem = [{ role: 'system' as const, content: prompt }, ...messages];
      }

      let fullResponse = '';

      // Convert messages to Ollama format
      const ollamaMessages = messagesWithSystem.map(msg => ({
        role: msg.role === 'tool' ? 'user' : msg.role,
        content: msg.role === 'tool' 
          ? `Tool result for ${msg.tool_call_id}: ${msg.content}`
          : msg.content
      }));

      // Use Ollama's streaming chat
      const response = await this.ollamaClient.chat(ollamaMessages, {
        stream: true,
        model: this.currentModel
      });

      // Handle streaming response
      let isInThinking = false;
      let currentThinkingContent = '';
      let hasNotifiedThinkingStart = false;
      
      for await (const chunk of response as any) {
        if (chunk.message?.content) {
          const token = chunk.message.content;
          fullResponse += token;
          
          // Handle real-time thinking detection and streaming
          const wasInThinking = isInThinking;
          const thinkingResult = this.processThinkingContent(fullResponse, token, currentThinkingContent, isInThinking);
          isInThinking = thinkingResult.isInThinking;
          currentThinkingContent = thinkingResult.currentThinkingContent;
          
          // Notify when thinking starts
          if (!wasInThinking && isInThinking && !hasNotifiedThinkingStart) {
            callbacks.onThinkingStart?.();
            hasNotifiedThinkingStart = true;
          }
          
          // Notify when thinking ends
          if (wasInThinking && !isInThinking) {
            callbacks.onThinkingEnd?.();
          }
          
          // Stream thinking content if we're in thinking mode
          if (thinkingResult.newThinkingContent) {
            callbacks.onThinking?.(thinkingResult.newThinkingContent);
          }
          
          // Stream visible content (non-thinking) if available
          if (thinkingResult.newVisibleContent) {
            callbacks.onToken?.(thinkingResult.newVisibleContent);
          }

          // Don't detect or show tool calls during streaming - wait until completely done
        }

        if (chunk.done) {
          // Final processing - extract complete thinking and clean content
          const finalThinking = this.extractCompleteThinking(fullResponse);
          const finalCleanContent = fullResponse.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/g, '').trim();
          
          // Send final thinking if we haven't sent it yet
          if (finalThinking && !currentThinkingContent) {
            callbacks.onThinking?.(finalThinking);
          }
          
          // Only execute tools from the clean content (after thinking is completely done)
          const finalToolCalls = this.extractToolCalls(finalCleanContent);
          
          // Now execute tool calls and continue conversation if any were found
          if (finalToolCalls.length > 0) {
            
            // First, notify UI about detected tool calls
            this.notifyToolCallsDetected(finalToolCalls, callbacks);
            
            // Then execute them
            const enhancedResponse = await this.executeToolCallsAndContinue(
              messagesWithSystem,
              fullResponse,
              finalToolCalls,
              callbacks
            );
            callbacks.onComplete?.(enhancedResponse);
            return enhancedResponse;
          } else {
            callbacks.onComplete?.(fullResponse);
            return fullResponse;
          }
        }
      }

      return fullResponse;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Notify UI about detected tool calls
   */
  private notifyToolCallsDetected(toolCalls: ToolCall[], callbacks: StreamCallback) {
    // Notify UI about each tool call for display
    for (const toolCall of toolCalls) {
      callbacks.onToolCall?.(toolCall);
    }
  }

  /**
   * Execute tool calls and continue conversation
   */
  private async executeToolCallsAndContinue(
    messages: AIMessage[],
    response: string,
    toolCalls: ToolCall[],
    callbacks: StreamCallback
  ): Promise<string> {
    
    // Execute all tool calls
    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const result = await this.executeToolCall(toolCall);
        callbacks.onToolResult?.(result);
        return { toolCall, result };
      })
    );

    // Add assistant message with tool calls
    const assistantMessage: AIMessage = {
      role: 'assistant',
      content: response,
      tool_calls: toolCalls
    };

    // Add tool result messages
    const toolMessages: AIMessage[] = toolResults.map(({ toolCall, result }) => ({
      role: 'tool',
      content: result.content.map(c => c.text).join('\n'),
      tool_call_id: toolCall.id
    }));

    // Continue conversation with tool results
    const newMessages = [...messages, assistantMessage, ...toolMessages];
    
    // Generate follow-up response with tool results
    const followUpResponse = await this.chatStream(newMessages, {
      ...callbacks,
      onComplete: undefined // Prevent infinite recursion
    });

    return response + '\n\n' + followUpResponse;
  }

  /**
   * Extract tool calls from response text
   */
  private extractToolCalls(text: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    
    // Pattern for mcp-tool code blocks
    const mcpPattern = /```mcp-tool\s*([\s\S]*?)```/g;
    let match;

    while ((match = mcpPattern.exec(text)) !== null) {
      try {
        const toolData = JSON.parse(match[1].trim());
        const toolName = toolData.tool || toolData.name;
        const toolArgs = JSON.stringify(toolData.parameters || toolData.params || {});
        
        // Generate a stable ID based on the tool content
        const toolId = `call_${toolName}_${Math.abs(toolArgs.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0))}`;
        
        toolCalls.push({
          id: toolId,
          type: 'function',
          function: {
            name: toolName,
            arguments: toolArgs
          }
        });
      } catch (error) {
        console.error('Error parsing tool call:', error);
      }
    }

    // Also look for natural language tool mentions as fallback
    if (toolCalls.length === 0) {
      const naturalLanguagePatterns = [
        // Pattern for scanned folders requests
        /(?:get|show|list|fetch|retrieve)\s+(?:the\s+)?scanned\s+folders?/i,
        // Pattern for device info requests  
        /(?:get|show|fetch|retrieve)\s+(?:the\s+)?device\s+(?:info|information)/i,
        // Pattern for adding tasks
        /(?:add|create)\s+(?:a\s+)?(?:task|sample\s+task)/i,
        // Pattern for getting files
        /(?:get|show|list|fetch|retrieve)\s+(?:random\s+)?files?/i,
        // Pattern for getting sessions
        /(?:get|show|list|fetch|retrieve)\s+(?:the\s+)?sessions?/i
      ];

      for (const pattern of naturalLanguagePatterns) {
        const naturalMatch = text.match(pattern);
        if (naturalMatch) {
          let toolName = '';
          let defaultParams = {};
          
          // Determine which tool to call based on the matched pattern
          if (pattern.source.includes('scanned')) {
            toolName = 'banbury-get-scanned-folders';
            defaultParams = {}; // No parameters needed - authentication handled automatically
          } else if (pattern.source.includes('device')) {
            toolName = 'banbury-get-device-info';
            defaultParams = {};
          } else if (pattern.source.includes('task')) {
            toolName = 'banbury-add-task';
            defaultParams = { task_description: 'Sample task' };
          } else if (pattern.source.includes('files')) {
            toolName = 'banbury-get-random-files';
            defaultParams = {};
          } else if (pattern.source.includes('sessions')) {
            toolName = 'banbury-get-sessions';
            defaultParams = {};
          }
          
          if (toolName) {
            const toolArgs = JSON.stringify(defaultParams);
            const toolId = `call_natural_${toolName}_${Date.now()}`;
            
            toolCalls.push({
              id: toolId,
              type: 'function',
              function: {
                name: toolName,
                arguments: toolArgs
              }
            });
            
            break; // Only create one tool call per response
          }
        }
      }
    }

    return toolCalls;
  }

  /**
   * Execute a single tool call
   */
  private async executeToolCall(toolCall: ToolCall): Promise<McpToolResult> {
    try {
      const parameters = JSON.parse(toolCall.function.arguments);
      
      // Handle web search tool
      if (toolCall.function.name === 'web_search') {
        if (!this.webSearchEnabled) {
          return {
            success: false,
            content: [{ type: 'text', text: 'Web search is not enabled' }],
            error: 'Web search is not enabled'
          };
        }
        
        const query = parameters.query || '';
        const maxResults = parameters.maxResults || 5;
        
        if (!query) {
          return {
            success: false,
            content: [{ type: 'text', text: 'Search query is required' }],
            error: 'Search query is required'
          };
        }
        
        const searchResults = await this.webSearchService.search(query, maxResults);
        const resultText = searchResults.map(result => 
          `**${result.title}**\n${result.snippet}\nSource: ${result.link}`
        ).join('\n\n');
        
        return {
          success: true,
          content: [{ type: 'text', text: `Web search results for "${query}":\n\n${resultText}` }]
        };
      }
      
      // Handle MCP tools
      if (!this.mcpClient) {
        return {
          success: false,
          content: [{ type: 'text', text: 'MCP client not available' }],
          error: 'MCP client not available'
        };
      }

      const mcpCall: McpToolCall = {
        tool: toolCall.function.name,
        parameters
      };

      return await this.mcpClient.callTool(mcpCall);
    } catch (error) {
      return {
        success: false,
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Non-streaming chat
   */
  public async chat(messages: AIMessage[]): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      
      this.chatStream(messages, {
        onToken: (token) => fullResponse += token,
        onComplete: () => resolve(fullResponse),
        onError: reject
      });
    });
  }

  /**
   * Check if MCP client is available and authenticated
   */
  public isMcpReady(): boolean {
    return this.mcpClient?.isAuthenticated() || false;
  }
} 
