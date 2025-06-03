import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { CloudMcpClient, McpToolCall, McpToolResult } from './CloudMcpClient';
import { ToolCall } from './EnhancedAIClient';

export interface LangChainStreamCallback {
  onToken?: (token: string) => void;
  onThinking?: (thinking: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (result: McpToolResult) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export interface LangChainOptions {
  temperature?: number;
  maxRetries?: number;
}

export interface LangChainMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

/**
 * LangChain-powered AI Client with visible thinking and tool calling
 * Simplified version focused on thinking process before tool execution
 */
export class LangChainAIClient {
  private llm: ChatOllama;
  private llmWithTools: any; // Runnable with tools bound

  private mcpClient: CloudMcpClient | null;
  private systemPrompt: string;
  private banburyTools: any[] = [];
  private baseUrl: string;
  private model: string;

  constructor(
    ollamaBaseUrl: string = 'http://localhost:11434',
    model: string = 'qwen3:latest',
    mcpClient: CloudMcpClient | null = null
  ) {
    this.baseUrl = ollamaBaseUrl;
    this.model = model;
    
    this.llm = new ChatOllama({
      baseUrl: ollamaBaseUrl,
      model: model,
      temperature: 0.7,
    });
    
    this.mcpClient = mcpClient;
    this.systemPrompt = this.createSystemPrompt();
    this.banburyTools = this.createBanburyTools();
    this.llmWithTools = this.llm.bindTools(this.banburyTools);
  }

  private createSystemPrompt(): string {
    return `You are an advanced AI assistant with structured thinking capabilities and access to various tools through the Banbury platform.

🧠 **STRUCTURED THINKING APPROACH**

You operate with a clear, methodical workflow that makes your reasoning transparent:

CRITICAL: Always show your thinking process using <thinking> tags, but ONLY use tools when they are actually needed to answer the user's question.

**Your structured workflow:**

1. **DEEP ANALYSIS** (in <thinking> tags):
   - What exactly is the user asking for?
   - Can I answer this with my existing knowledge?
   - Do I need additional information from tools to provide a complete answer?
   - Which tools (if any) would be most appropriate?
   - What's my step-by-step plan?

2. **SELECTIVE TOOL USAGE**:
   - Only use tools when necessary to fulfill the user's request
   - Don't use tools for general questions that can be answered without them
   - Use tools strategically when you need current system information
   - Handle errors gracefully and provide alternatives

3. **COMPREHENSIVE SYNTHESIS**:
   - Integrate findings (with or without tools) into a coherent response
   - Provide actionable insights and recommendations
   - Answer directly if no tools are needed

**Examples of when to use tools:**
- User asks about their files or device → Use banbury-get-device-info or banbury-get-random-files
- User asks about system status → Use banbury-get-sessions
- User wants to create a task → Use banbury-add-task
- User asks about monitored folders → Use banbury-get-scanned-folders

**Examples of when NOT to use tools:**
- General questions about concepts, explanations, or how-to guides
- Questions about programming, technology, or general knowledge
- Creative writing, analysis, or problem-solving that doesn't need system data
- Casual conversation or clarifying questions

**Available Banbury Tools (use only when needed):**
- banbury-get-scanned-folders: Get all monitored directory locations
- banbury-get-random-files: Get random file samples from monitored system
- banbury-get-device-info: Get comprehensive device information and status
- banbury-get-sessions: Get current active sessions and task information
- banbury-add-task: Create new tasks in the system queue

**Core Principles:**
- Think systematically before deciding whether to use tools
- Be efficient - don't call tools unnecessarily
- Use tools only when they add value to your response
- Provide helpful responses whether or not tools are used
- Handle both tool-based and knowledge-based responses excellently

Your thinking process should clearly indicate whether tools are needed and why.`;
  }

  /**
   * Create Banbury tools using proper LangChain tool definitions with Zod schemas
   */
  private createBanburyTools() {
    const deviceInfoTool = tool(
      async ({ device_name }) => {
        if (!this.mcpClient) {
          return 'MCP client not available';
        }
        try {
          const result = await this.mcpClient.callTool({
            tool: 'banbury-get-device-info',
            parameters: { device_name }
          });
          return result.content.map(c => c.text).join('\n');
        } catch (error) {
          return `Error: ${error}`;
        }
      },
      {
        name: "banbury-get-device-info",
        description: "Get comprehensive device information and status including performance metrics",
        schema: z.object({
          device_name: z.string().optional().describe("Device name to query (optional)"),
        }),
      }
    );

    const sessionsTool = tool(
      async ({}) => {
        if (!this.mcpClient) {
          return 'MCP client not available';
        }
        try {
          const result = await this.mcpClient.callTool({
            tool: 'banbury-get-sessions',
            parameters: {}
          });
          return result.content.map(c => c.text).join('\n');
        } catch (error) {
          return `Error: ${error}`;
        }
      },
      {
        name: "banbury-get-sessions",
        description: "Get current active sessions and task information from the system",
        schema: z.object({}),
      }
    );

    const scannedFoldersTool = tool(
      async ({ device_name }) => {
        if (!this.mcpClient) {
          return 'MCP client not available';
        }
        try {
          const result = await this.mcpClient.callTool({
            tool: 'banbury-get-scanned-folders',
            parameters: { device_name }
          });
          return result.content.map(c => c.text).join('\n');
        } catch (error) {
          return `Error: ${error}`;
        }
      },
      {
        name: "banbury-get-scanned-folders",
        description: "List all monitored directory locations on the device",
        schema: z.object({
          device_name: z.string().optional().describe("Device name to query (optional)"),
        }),
      }
    );

    const randomFilesTool = tool(
      async ({ count, device_name }) => {
        if (!this.mcpClient) {
          return 'MCP client not available';
        }
        try {
          const result = await this.mcpClient.callTool({
            tool: 'banbury-get-random-files',
            parameters: { count, device_name }
          });
          return result.content.map(c => c.text).join('\n');
        } catch (error) {
          return `Error: ${error}`;
        }
      },
      {
        name: "banbury-get-random-files",
        description: "Get a random sample of files from the monitored system",
        schema: z.object({
          count: z.number().default(10).describe("Number of random files to retrieve"),
          device_name: z.string().optional().describe("Device name to query (optional)"),
        }),
      }
    );

    const addTaskTool = tool(
      async ({ task_description, device_name }) => {
        if (!this.mcpClient) {
          return 'MCP client not available';
        }
        try {
          const result = await this.mcpClient.callTool({
            tool: 'banbury-add-task',
            parameters: { task_description, device_name }
          });
          return result.content.map(c => c.text).join('\n');
        } catch (error) {
          return `Error: ${error}`;
        }
      },
      {
        name: "banbury-add-task",
        description: "Create a new task in the system queue",
        schema: z.object({
          task_description: z.string().describe("Description of the task to add"),
          device_name: z.string().optional().describe("Device name to assign task to (optional)"),
        }),
      }
    );

    return [deviceInfoTool, sessionsTool, scannedFoldersTool, randomFilesTool, addTaskTool];
  }

  /**
   * Enhanced chat with streaming response, thinking process, tool calling, and structured output
   */
  public async chatStream(
    messages: LangChainMessage[],
    callbacks: LangChainStreamCallback = {},
    options: LangChainOptions = {}
  ): Promise<string> {
    try {
      // Convert messages to LangChain format
      const langchainMessages = this.convertMessagesToLangChain(messages);
      
      // Add system prompt if not present
      if (!langchainMessages.some(msg => msg instanceof SystemMessage)) {
        langchainMessages.unshift(new SystemMessage(this.systemPrompt));
      }

      // Step 1: Get initial response with tools available (model decides whether to use them)
      const modelWithTools = this.llm.bindTools(this.banburyTools);
      const initialResponse = await modelWithTools.invoke(langchainMessages);
      
      let fullResponse = initialResponse.content as string;
      
      // Extract and handle thinking tags
      const thinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)<\/thinking>/);
      if (thinkingMatch) {
        callbacks.onThinking?.(thinkingMatch[1].trim());
        // Remove thinking content from the visible response
        fullResponse = fullResponse.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
      }
      
      // Only stream the initial response content if there's actual content to stream
      if (fullResponse.length > 0) {
        this.streamText(fullResponse, callbacks);
      } else {
      }
      
      // Only proceed with tool execution if the model actually decided to call tools
      if (initialResponse.tool_calls && initialResponse.tool_calls.length > 0) {
        const toolResults = await this.executeToolChain(
          langchainMessages, 
          initialResponse, 
          callbacks
        );
        
        // Continue conversation with tool results
        const finalResponse = await this.continueConversationWithResults(
          langchainMessages,
          initialResponse,
          toolResults,
          this.llm,
          callbacks
        );
        
        fullResponse += `\n\n${finalResponse}`;
      } else {
      }

      callbacks.onComplete?.(fullResponse);
      return fullResponse;

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      callbacks.onError?.(err);
      throw err;
    }
  }



  /**
   * Stream text token by token for better UX
   */
  private streamText(text: string, callbacks: LangChainStreamCallback, delay: number = 20) {
    // Don't stream if text is empty
    if (!text || text.trim().length === 0) {
      return;
    }
    
    const words = text.split(' ');
    
    words.forEach((word, index) => {
      setTimeout(() => {
        // Send incremental tokens (just the word and space if needed)
        const token = (index > 0 ? ' ' : '') + word;
        callbacks.onToken?.(token);
      }, delay * index);
    });
  }

  /**
   * Execute tool chain following LangChain patterns
   */
  private async executeToolChain(
    messages: any[],
    initialResponse: any,
    callbacks: LangChainStreamCallback
  ): Promise<ToolMessage[]> {
    const toolResults: ToolMessage[] = [];
    const messagesWithResponse = [...messages, initialResponse];
    
    for (const toolCall of initialResponse.tool_calls) {
      // Notify about tool call
      callbacks.onToolCall?.({
        id: toolCall.id,
        type: 'function',
        function: {
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.args)
        }
      });
      
      try {
        // Execute the actual bound tool (LangChain will handle this automatically)
        // But we need to call our MCP backend since tools are bound to MCP functions
        const result = await this.executeMcpTool(toolCall.name, toolCall.args);
        
        // Create proper ToolMessage as per LangChain documentation
        const toolMessage = new ToolMessage({
          content: result,
          tool_call_id: toolCall.id,
        });
        
        toolResults.push(toolMessage);
        messagesWithResponse.push(toolMessage);
        
        callbacks.onToolResult?.({
          success: true,
          content: [{ type: 'text', text: result }]
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const toolMessage = new ToolMessage({
          content: `Error executing ${toolCall.name}: ${errorMessage}`,
          tool_call_id: toolCall.id,
        });
        
        toolResults.push(toolMessage);
        messagesWithResponse.push(toolMessage);
        
        callbacks.onToolResult?.({
          success: false,
          content: [{ type: 'text', text: errorMessage }],
          error: errorMessage
        });
      }
    }
    
    return toolResults;
  }

  /**
   * Continue conversation with tool results following LangChain patterns
   */
  private async continueConversationWithResults(
    originalMessages: any[],
    initialResponse: any,
    toolResults: ToolMessage[],
    llm: ChatOllama,
    callbacks: LangChainStreamCallback
  ): Promise<string> {
    // Build the complete message chain as per LangChain documentation
    const conversationWithResults = [
      ...originalMessages,
      initialResponse,
      ...toolResults
    ];
    
    // Get final response that incorporates tool results
    const finalResponse = await llm.invoke(conversationWithResults);
    const finalContent = finalResponse.content as string;
    
    // Handle thinking in final response
    const thinkingMatch = finalContent.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (thinkingMatch) {
      callbacks.onThinking?.(thinkingMatch[1].trim());
    }
    
    // Clean and stream final content
    const cleanContent = finalContent.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
    if (cleanContent.length > 0) {
      this.streamText(cleanContent, callbacks);
    }
    
    return cleanContent;
  }

  /**
   * Execute MCP tool by name with parameters
   */
  private async executeMcpTool(toolName: string, parameters: any): Promise<string> {
    if (!this.mcpClient) {
      throw new Error('MCP client not available');
    }

    const result = await this.mcpClient.callTool({
      tool: toolName,
      parameters
    });

    if (!result.success) {
      throw new Error(result.error || 'Tool execution failed');
    }

    return result.content.map(c => c.text).join('\n');
  }



  private convertMessagesToLangChain(messages: LangChainMessage[]) {
    return messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
        case 'tool':
          return new AIMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });
  }

  /**
   * Update the MCP client
   */
  public setMcpClient(mcpClient: CloudMcpClient | null) {
    this.mcpClient = mcpClient;
  }

  /**
   * Update the model
   */
  public setModel(model: string) {
    this.model = model;
    
    this.llm = new ChatOllama({
      baseUrl: this.baseUrl,
      model: model,
      temperature: 0.7,
    });
    
    // Rebuild tools binding with new model
    this.llmWithTools = this.llm.bindTools(this.banburyTools);
  }

  /**
   * Non-streaming chat
   */
  public async chat(messages: LangChainMessage[], options?: LangChainOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      
      this.chatStream(messages, {
        onToken: (token) => fullResponse += token,
        onComplete: () => resolve(fullResponse),
        onError: reject
      }, options);
    });
  }



  /**
   * Create a prompt template chain (for advanced chaining)
   */
  public createPromptChain(template: string, inputVariables: string[] = []) {
    const promptTemplate = ChatPromptTemplate.fromTemplate(template);
    return promptTemplate.pipe(this.llm);
  }

  /**
   * Multimodal support - handle images in messages
   */
  public async chatWithImages(
    messages: LangChainMessage[],
    callbacks?: LangChainStreamCallback,
    options?: LangChainOptions
  ): Promise<string> {
    // Convert messages to support image content
    const multimodalMessages = messages.map(msg => {
      if (msg.role === 'user' && (msg as any).images) {
        return new HumanMessage({
          content: [
            { type: "text", text: msg.content },
            ...(msg as any).images.map((img: string) => ({
              type: "image_url",
              image_url: `data:image/jpeg;base64,${img}`,
            }))
          ],
        });
      }
      return this.convertMessageToLangChain(msg);
    });

    // Add system prompt
    if (!multimodalMessages.some(msg => msg instanceof SystemMessage)) {
      multimodalMessages.unshift(new SystemMessage(this.systemPrompt));
    }

    // Use regular chat flow but with multimodal messages
    if (callbacks) {
      return this.chatStream(messages, callbacks, options);
    } else {
      const response = await this.llm.invoke(multimodalMessages);
      return response.content as string;
    }
  }

  /**
   * Helper to convert single message to LangChain format
   */
  private convertMessageToLangChain(msg: LangChainMessage) {
    switch (msg.role) {
      case 'system':
        return new SystemMessage(msg.content);
      case 'user':
        return new HumanMessage(msg.content);
      case 'assistant':
      case 'tool':
        return new AIMessage(msg.content);
      default:
        return new HumanMessage(msg.content);
    }
  }

  /**
   * Test method to verify tool calling behavior - for debugging
   */
  public async testToolCalling(query: string): Promise<{ usedTools: boolean; toolNames?: string[] }> {
    const messages = [{ role: 'user' as const, content: query }];
    const langchainMessages = this.convertMessagesToLangChain(messages);
    langchainMessages.unshift(new SystemMessage(this.systemPrompt));

    const modelWithTools = this.llm.bindTools(this.banburyTools);
    const response = await modelWithTools.invoke(langchainMessages);

    return {
      usedTools: !!(response.tool_calls && response.tool_calls.length > 0),
      toolNames: response.tool_calls?.map((tc: any) => tc.name)
    };
  }
} 
