import { OllamaClient } from './index';
import { CloudMcpClient, McpToolCall, McpToolResult } from '../mcp/CloudMcpClient';

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
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (result: McpToolResult) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Enhanced AI Client that combines Ollama with MCP tool calling capabilities
 */
export class EnhancedAIClient {
  private ollamaClient: OllamaClient;
  private mcpClient: CloudMcpClient | null;
  private systemPrompt: string;
  private currentModel: string;
  private executedToolCalls: Set<string> = new Set(); // Track executed tool calls

  constructor(
    ollamaBaseUrl: string = 'http://localhost:11434',
    model: string = 'llava',
    mcpClient: CloudMcpClient | null = null
  ) {
    this.ollamaClient = new OllamaClient(ollamaBaseUrl, model);
    this.mcpClient = mcpClient;
    this.currentModel = model;
    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * Build system prompt that includes MCP tool instructions
   */
  private buildSystemPrompt(): string {
    const basePrompt = `You are Banbury AI, an intelligent assistant with access to the Banbury system and its tools.`;
    
    if (!this.mcpClient) {
      return basePrompt;
    }

    const availableTools = this.mcpClient.getAvailableTools();
    
    return `${basePrompt}

You have access to the following tools through the Banbury MCP server:

**Available Tools:**
${availableTools.map(tool => `- ${tool}`).join('\n')}

**CRITICAL: Tool Usage Instructions**
When you need to use a tool, you MUST format your request using this EXACT format:

\`\`\`mcp-tool
{
  "tool": "tool_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
\`\`\`

**IMPORTANT**: You MUST use the exact \`\`\`mcp-tool code block format above. Simply mentioning a tool name will NOT execute it. You must use the code block format.

**Tool Parameter Examples:**
- banbury-get-scanned-folders: \`{"environment": "dev"}\` (device_name is optional)
- banbury-add-task: \`{"task_description": "Your task here", "environment": "dev"}\`
- banbury-get-device-info: \`{"device_name": "device_name_here", "environment": "dev"}\`
- banbury-get-sessions: \`{"environment": "dev"}\`

**Common Use Cases:**
- To get scanned folders: Use "banbury-get-scanned-folders" (no parameters needed - device will be auto-detected)
- To get random files: First use "banbury-get-scanned-folders", then "banbury-get-files" with specific paths
- To add a task: Use "banbury-add-task" with a task_description
- To get device info: Use "banbury-get-device-info" with a device_name
- To get sessions: Use "banbury-get-sessions"
- For math: Use "add" with parameters a and b
- For entertainment: Use "get-joke"

**Example of correct tool usage:**
User: "Get scanned folders"
You should respond with:
I'll get the scanned folders for you using the banbury-get-scanned-folders tool.

\`\`\`mcp-tool
{
  "tool": "banbury-get-scanned-folders",
  "parameters": {
    "environment": "dev"
  }
}
\`\`\`

Then wait for the tool result before continuing your response.

Always explain what you're doing before calling tools, and interpret the results for the user in a helpful way.`;
  }

  /**
   * Update the MCP client
   */
  public setMcpClient(mcpClient: CloudMcpClient | null) {
    this.mcpClient = mcpClient;
    this.systemPrompt = this.buildSystemPrompt();
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
   * Chat with streaming response and tool calling
   */
  public async chatStream(
    messages: AIMessage[],
    callbacks: StreamCallback = {}
  ): Promise<string> {
    try {
      // Clear executed tool calls for new conversation
      this.executedToolCalls.clear();
      
      // Add system prompt if not present
      const messagesWithSystem = messages[0]?.role === 'system' 
        ? messages 
        : [{ role: 'system' as const, content: this.systemPrompt }, ...messages];

      let fullResponse = '';
      let pendingToolCalls: ToolCall[] = [];

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
      for await (const chunk of response as any) {
        if (chunk.message?.content) {
          const token = chunk.message.content;
          fullResponse += token;
          
          // Check for thinking tags and handle appropriately
          if (fullResponse.includes('<thinking>') && fullResponse.includes('</thinking>')) {
            const thinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)<\/thinking>/);
            if (thinkingMatch) {
              callbacks.onThinking?.(thinkingMatch[1]);
            }
            // Remove thinking content from the visible response
            const visibleContent = fullResponse.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
            callbacks.onToken?.(visibleContent.slice(fullResponse.length - token.length));
          } else {
            callbacks.onToken?.(token);
          }

          // Collect tool calls but don't execute them yet during streaming
          const currentToolCalls = this.extractToolCalls(fullResponse);
          pendingToolCalls = currentToolCalls;
          
          // Also provide immediate feedback about detected tool calls
          this.detectAndExecuteToolCalls(fullResponse, callbacks);
        }

        if (chunk.done) {
          // Now execute tool calls and continue conversation if any were found
          if (pendingToolCalls.length > 0) {
            console.log(`🔄 Executing ${pendingToolCalls.length} tool calls after streaming completed`);
            const enhancedResponse = await this.executeToolCallsAndContinue(
              messagesWithSystem,
              fullResponse,
              pendingToolCalls,
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
   * Detect and execute tool calls in streaming response
   */
  private detectAndExecuteToolCalls(response: string, callbacks: StreamCallback) {
    // This method is now only used for immediate feedback during streaming
    // Actual execution happens after streaming completes
    const toolCalls = this.extractToolCalls(response);
    
    if (toolCalls.length > 0) {
      console.log(`🔄 detectAndExecuteToolCalls found ${toolCalls.length} tool calls (will execute after streaming)`);
    }
    
    for (const toolCall of toolCalls) {
      // Generate a unique key for this tool call based on content, not ID
      const toolKey = `${toolCall.function.name}_${toolCall.function.arguments}`;
      
      // Check if we've already processed this exact tool call
      if (!this.executedToolCalls.has(toolKey)) {
        console.log(`📋 Detected tool call: ${toolCall.function.name}`, JSON.parse(toolCall.function.arguments));
        this.executedToolCalls.add(toolKey);
        callbacks.onToolCall?.(toolCall);
        // Don't execute here - just notify
      } else {
        console.log(`⏭️ Skipping already detected tool call: ${toolCall.function.name}`);
      }
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
    console.log(`🚀 Executing ${toolCalls.length} tool calls and continuing conversation`);
    
    // Execute all tool calls
    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall) => {
        console.log(`🛠️ Executing tool: ${toolCall.function.name}`);
        const result = await this.executeToolCall(toolCall);
        console.log(`✅ Tool completed: ${toolCall.function.name}`, result);
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
    
    console.log(`🔄 Continuing conversation with tool results`, newMessages.length, 'messages');
    
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
        // Pattern for "banbury-get-scanned-folders" tool mention
        /(?:use|call|execute)\s+(?:the\s+)?["']?banbury-get-scanned-folders["']?\s+tool(?:\s+without\s+(?:any\s+)?parameters)?/i,
        // Pattern for other banbury tools
        /(?:use|call|execute)\s+(?:the\s+)?["']?(banbury-[a-z-]+)["']?\s+tool/i
      ];

      for (const pattern of naturalLanguagePatterns) {
        const naturalMatch = text.match(pattern);
        if (naturalMatch) {
          console.log('🔍 Detected natural language tool call:', naturalMatch[0]);
          
          let toolName = 'banbury-get-scanned-folders'; // Default for the first pattern
          if (naturalMatch[1]) {
            toolName = naturalMatch[1]; // Extracted tool name from second pattern
          }
          
          // Create a tool call with default parameters
          const defaultParams = toolName === 'banbury-get-scanned-folders' 
            ? { environment: 'dev' }
            : { environment: 'dev' };
          
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
          
          console.log('✅ Created tool call from natural language:', { toolName, defaultParams });
          break; // Only create one tool call per response
        }
      }
    }

    console.log(`🔧 Extracted ${toolCalls.length} tool calls from response`, toolCalls.map(tc => tc.function.name));
    return toolCalls;
  }

  /**
   * Execute a single tool call
   */
  private async executeToolCall(toolCall: ToolCall): Promise<McpToolResult> {
    if (!this.mcpClient) {
      return {
        success: false,
        content: [{ type: 'text', text: 'MCP client not available' }],
        error: 'MCP client not available'
      };
    }

    try {
      const parameters = JSON.parse(toolCall.function.arguments);
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
   * Get available tools from MCP client
   */
  public getAvailableTools(): string[] {
    return this.mcpClient?.getAvailableTools() || [];
  }

  /**
   * Check if MCP client is available and authenticated
   */
  public isMcpReady(): boolean {
    return this.mcpClient?.isAuthenticated() || false;
  }
} 