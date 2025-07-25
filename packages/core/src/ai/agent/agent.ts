import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BanburyMcpClient, McpToolResult } from '../basic/tools/banburyMCP/BanburyMcpClient';
import { ToolCall } from '../basic/BasicClient';
import { WebSearchService } from '../basic/tools/webSearch';
import { createBanburyTools } from './tools/banburyTools';
import { createFileSystemTools } from './tools/filesystemTools';
import { createWebSearchTools } from './tools/webSearchTools';
import { createGmailTools } from './tools/gmailTools';
import { createGoogleCalendarTools } from './tools/googleCalendarTools';
import os from 'os';

export interface AgentStreamCallback {
  onToken?: (token: string) => void;
  onThinking?: (thinking: string) => void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (result: McpToolResult) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export interface AgentOptions {
  temperature?: number;
  maxRetries?: number;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

export interface ToolConfiguration {
  webSearch: boolean;
  banbury: boolean;
  filesystem: boolean;
  gmail?: boolean;
  googleCalendar?: boolean;
  googleDrive?: boolean;
  googleTasks?: boolean;
}

/**
 * LangChain-powered AI Client with visible thinking and tool calling
 * Simplified version focused on thinking process before tool execution
 */
export class Agent {
  private llm: ChatOllama;
  private mcpClient: BanburyMcpClient | null;
  private webSearchService: WebSearchService;
  private systemPrompt: string;
  private banburyTools: any[] = [];
  private fileSystemTools: any[] = [];
  private webSearchTools: any[] = [];
  private gmailTools: any[] = [];
  private googleCalendarTools: any[] = [];
  private allTools: any[] = [];
  private toolsMap: Map<string, any> = new Map(); // For quick tool lookup
  private baseUrl: string;
  private model: string;
  private llmWithTools: any ;
  private fileSystemRootDir: string;
  private toolConfig: ToolConfiguration;

  constructor(
    ollamaBaseUrl: string = 'http://localhost:11434',
    model: string = 'qwen3:latest',
    mcpClient: BanburyMcpClient | null = null,
    fileSystemRootDir: string = os.homedir(), // Default to user's home directory
    toolConfig: ToolConfiguration = {
      webSearch: true,
      banbury: true,
      filesystem: true,
      gmail: false,
      googleCalendar: false,
      googleDrive: false,
      googleTasks: false
    }
  ) {
    this.baseUrl = ollamaBaseUrl;
    this.model = model;
    this.fileSystemRootDir = fileSystemRootDir;
    this.toolConfig = toolConfig;
    this.webSearchService = new WebSearchService();
    
    this.llm = new ChatOllama({
      baseUrl: ollamaBaseUrl,
      model: model,
      temperature: 0.7,
    });
    
    this.mcpClient = mcpClient;
    this.systemPrompt = this.createSystemPrompt();
    this.rebuildTools();
  }

  private rebuildTools() {
    this.banburyTools = this.toolConfig.banbury ? createBanburyTools(this.mcpClient) : [];
    this.fileSystemTools = this.toolConfig.filesystem ? createFileSystemTools(this.fileSystemRootDir) : [];
    this.webSearchTools = this.toolConfig.webSearch ? createWebSearchTools(this.webSearchService) : [];
    this.gmailTools = this.toolConfig.gmail ? createGmailTools(this.toolConfig.gmail) : [];
    this.googleCalendarTools = this.toolConfig.googleCalendar ? createGoogleCalendarTools(this.toolConfig.googleCalendar) : [];
    this.allTools = [...this.banburyTools, ...this.fileSystemTools, ...this.webSearchTools, ...this.gmailTools, ...this.googleCalendarTools];
    this.populateToolsMap();
    this.llmWithTools = this.llm.bindTools(this.allTools);
  }

  private createSystemPrompt(): string {
    const webSearchInfo = this.toolConfig.webSearch ? `

**Available Web Search Tools (use only when needed):**
- web_search_tool: Search the web for current information, news, facts, or any query that requires up-to-date information
  Parameters:
  - query: Search query string
  - maxResults: Maximum number of results to return (default: 5)

**When to use web search:**
- User asks for current news, events, or recent information
- Questions about current stock prices, weather, sports scores
- Any query that requires real-time or recent data
- When your knowledge might be outdated
` : '';

    const banburyInfo = this.toolConfig.banbury ? `

**Available Banbury Tools (use only when needed):**
- banbury-get-scanned-folders: Get all monitored directory locations
- banbury-get-random-files: Get random file samples from monitored system
- banbury-get-device-info: Get comprehensive device information and status
- banbury-get-sessions: Get current active sessions and task information
- banbury-add-task: Create new tasks in the system queue
` : '';

    const filesystemInfo = this.toolConfig.filesystem ? `

**Available File System Tools (use only when needed):**
- file_read_tool: Read contents of a file
- file_write_tool: Write text content to a file
- file_list_directory_tool: List files and directories in a path
- file_copy_tool: Copy files from one location to another
- file_move_tool: Move/rename files
- file_delete_tool: Delete files or directories
- file_search_tool: Search for files matching patterns
` : '';

    const gmailInfo = this.toolConfig.gmail ? `

**Available Gmail Tools (use only when needed):**
- GmailSearch: Search for emails using Gmail query syntax
  Parameters:
  - query: Gmail search query (e.g., "from:sender@example.com", "subject:urgent", "is:unread")
  - maxResults: Maximum number of results to return (default: 10)

- GmailGetMessage: Get details of a specific email message
  Parameters:
  - messageId: The unique ID of the email message

- GmailGetThread: Get an entire email thread/conversation
  Parameters:
  - threadId: The unique ID of the email thread

- GmailCreateDraft: Create a draft email
  Parameters:
  - message: Email message object with to, subject, body fields

- GmailSendMessage: Send an email message
  Parameters:
  - message: Email message object with to, subject, body fields

**When to use Gmail tools:**
- User asks to search for specific emails or check inbox
- User wants to read a specific email or thread
- User wants to compose, draft, or send emails
- User asks about email management or organization
` : '';

    const googleCalendarInfo = this.toolConfig.googleCalendar ? `

**Available Google Calendar Tools (use only when needed):**
- GoogleCalendarListEvents: List calendar events with optional filters
  Parameters:
  - timeMin: Lower bound for event start time (RFC3339 timestamp)
  - timeMax: Upper bound for event start time (RFC3339 timestamp)
  - maxResults: Maximum number of events to return (default: 50)
  - q: Free text search terms
  - calendarId: Calendar identifier (default: "primary")

- GoogleCalendarGetEvent: Get details of a specific calendar event
  Parameters:
  - eventId: The unique ID of the calendar event
  - calendarId: Calendar identifier (default: "primary")

- GoogleCalendarCreateEvent: Create a new calendar event
  Parameters:
  - summary: Event title
  - startDateTime: Event start time (RFC3339 timestamp)
  - endDateTime: Event end time (RFC3339 timestamp)
  - description: Event description (optional)
  - location: Event location (optional)
  - attendees: Array of attendee email addresses (optional)
  - calendarId: Calendar identifier (default: "primary")

- GoogleCalendarUpdateEvent: Update an existing calendar event
  Parameters:
  - eventId: The unique ID of the event to update
  - Various optional update fields (summary, time, location, etc.)
  - calendarId: Calendar identifier (default: "primary")

- GoogleCalendarDeleteEvent: Delete a calendar event
  Parameters:
  - eventId: The unique ID of the event to delete
  - calendarId: Calendar identifier (default: "primary")

**When to use Google Calendar tools:**
- User asks to check their calendar or schedule
- User wants to create, update, or delete events
- User asks about upcoming meetings or appointments
- User needs to manage calendar entries
` : '';

    return `You are an advanced AI assistant with structured thinking capabilities and access to various tools through the Banbury platform and file system operations.

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
- User wants file operations → Use file system tools (read, write, list, etc.)
- User asks about file contents → Use file_read_tool
- User wants to manage directories → Use list_directory_tool
- User asks for current information or news → Use web_search_tool

**Examples of when NOT to use tools:**
- General questions about concepts, explanations, or how-to guides
- Questions about programming, technology, or general knowledge
- Creative writing, analysis, or problem-solving that doesn't need system data
- Casual conversation or clarifying questions
${banburyInfo}${filesystemInfo}${webSearchInfo}${gmailInfo}${googleCalendarInfo}

**Core Principles:**
- Think systematically before deciding whether to use tools
- Be efficient - don't call tools unnecessarily
- Use tools only when they add value to your response
- Provide helpful responses whether or not tools are used
- Handle both tool-based and knowledge-based responses excellently

Your thinking process should clearly indicate whether tools are needed and why.`;
  }

  /**
   * Populate tools map for quick lookup during tool execution
   */
  private populateToolsMap() {
    this.toolsMap.clear();
    for (const tool of this.allTools) {
      this.toolsMap.set(tool.name, tool);
    }
  }

  /**
   * Enhanced chat with streaming response, thinking process, tool calling, and structured output
   */
  public async chatStream(
    messages: AgentMessage[],
    callbacks: AgentStreamCallback = {},
  ): Promise<string> {
    try {
      // Convert messages to LangChain format
      const langchainMessages = this.convertMessagesToLangChain(messages);
      
      // Add system prompt if not present
      if (!langchainMessages.some(msg => msg instanceof SystemMessage)) {
        langchainMessages.unshift(new SystemMessage(this.systemPrompt));
      }

      // Step 1: Stream initial response with tools available (model decides whether to use them)
      const modelWithTools = this.llm.bindTools(this.allTools);
      const { fullResponse: initialFullResponse, initialResponse } = await this.streamInitialResponse(
        langchainMessages, 
        modelWithTools, 
        callbacks
      );
      
      let fullResponse = initialFullResponse;
      
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
   * Stream initial response with real-time thinking extraction
   */
  private async streamInitialResponse(
    messages: any[],
    modelWithTools: any,
    callbacks: AgentStreamCallback
  ): Promise<{ fullResponse: string; initialResponse: any }> {
    let fullResponse = '';
    let visibleContentSent = '';
    let currentThinking = '';
    let isInThinking = false;
    let hasNotifiedThinkingStart = false;
    let finalMessageObject: any = null;
    
    const stream = await modelWithTools.stream(messages);
    
    for await (const chunk of stream) {
      const content = chunk.content || '';
      fullResponse += content;
      
      // Check for thinking tag transitions
      const thinkingStartIndex = fullResponse.indexOf('<thinking>');
      const thinkingEndIndex = fullResponse.indexOf('</thinking>');
      
      if (thinkingStartIndex !== -1 && thinkingEndIndex === -1) {
        // We're entering thinking mode
        if (!hasNotifiedThinkingStart) {
          callbacks.onThinkingStart?.();
          hasNotifiedThinkingStart = true;
        }
        isInThinking = true;
        
        // Send any visible content before thinking tag
        const beforeThinking = fullResponse.substring(0, thinkingStartIndex);
        const newVisibleContent = beforeThinking.substring(visibleContentSent.length);
        if (newVisibleContent) {
          callbacks.onToken?.(newVisibleContent);
          visibleContentSent += newVisibleContent;
        }
        
        // Extract current thinking content
        currentThinking = fullResponse.substring(thinkingStartIndex + '<thinking>'.length);
        if (currentThinking.trim()) {
          callbacks.onThinking?.(currentThinking.trim());
        }
        
      } else if (thinkingStartIndex !== -1 && thinkingEndIndex !== -1) {
        // Complete thinking section found
        const thinkingContent = fullResponse.substring(
          thinkingStartIndex + '<thinking>'.length, 
          thinkingEndIndex
        );
        
        // Send final thinking content
        callbacks.onThinking?.(thinkingContent.trim());
        callbacks.onThinkingEnd?.();
        isInThinking = false;
        
        // Send any visible content after thinking tag
        const afterThinking = fullResponse.substring(thinkingEndIndex + '</thinking>'.length);
        const beforeThinking = fullResponse.substring(0, thinkingStartIndex);
        const totalVisible = beforeThinking + afterThinking;
        const newVisibleContent = totalVisible.substring(visibleContentSent.length);
        
        if (newVisibleContent) {
          callbacks.onToken?.(newVisibleContent);
          visibleContentSent += newVisibleContent;
        }
        
      } else if (isInThinking) {
        // We're in the middle of thinking content
        currentThinking = fullResponse.substring(thinkingStartIndex + '<thinking>'.length);
        callbacks.onThinking?.(currentThinking.trim());
        
      } else {
        // Regular visible content
        const newVisibleContent = fullResponse.substring(visibleContentSent.length);
        if (newVisibleContent) {
          callbacks.onToken?.(newVisibleContent);
          visibleContentSent += newVisibleContent;
        }
      }
      
      // Store the final message object with tool calls
      if (chunk.tool_calls || chunk.additional_kwargs?.tool_calls) {
        finalMessageObject = chunk;
      }
    }
    
    // Clean up the response by removing thinking tags
    const cleanResponse = fullResponse.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
    
    return {
      fullResponse: cleanResponse,
      initialResponse: finalMessageObject || { content: cleanResponse, tool_calls: [] }
    };
  }

  /**
   * Stream text token by token for better UX
   */
  private streamText(text: string, callbacks: AgentStreamCallback, delay: number = 20) {
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
   * Uses the proper LangChain tool.invoke(toolCall) pattern as per documentation
   */
  private async executeToolChain(
    messages: any[],
    initialResponse: any,
    callbacks: AgentStreamCallback
  ): Promise<ToolMessage[]> {
    const toolResults: ToolMessage[] = [];
    
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
        // Follow LangChain pattern: invoke the tool with the toolCall
        // This automatically returns a properly formatted ToolMessage
        const selectedTool = this.toolsMap.get(toolCall.name);
        if (!selectedTool) {
          throw new Error(`Tool ${toolCall.name} not found`);
        }
        
        const toolMessage = await selectedTool.invoke(toolCall);
        toolResults.push(toolMessage);
        
        callbacks.onToolResult?.({
          success: true,
          content: [{ type: 'text', text: toolMessage.content }]
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Create ToolMessage manually only for errors
        const toolMessage = new ToolMessage({
          content: `Error executing ${toolCall.name}: ${errorMessage}`,
          tool_call_id: toolCall.id,
        });
        
        toolResults.push(toolMessage);
        
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
    callbacks: AgentStreamCallback
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

  private convertMessagesToLangChain(messages: AgentMessage[]) {
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
  public setMcpClient(mcpClient: BanburyMcpClient | null) {
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
    
    // Rebuild tools and tools map
    this.rebuildTools();
  }

  /**
   * Update the file system root directory
   */
  public setFileSystemRoot(rootDir: string) {
    this.fileSystemRootDir = rootDir;
    this.rebuildTools();
  }

  /**
   * Update tool configuration
   */
  public setToolConfiguration(toolConfig: ToolConfiguration) {
    this.toolConfig = toolConfig;
    this.systemPrompt = this.createSystemPrompt();
    this.rebuildTools();
  }

  /**
   * Get current tool configuration
   */
  public getToolConfiguration(): ToolConfiguration {
    return { ...this.toolConfig };
  }

  /**
   * Enable or disable a specific tool category
   */
  public setToolEnabled(toolCategory: keyof ToolConfiguration, enabled: boolean) {
    this.toolConfig[toolCategory] = enabled;
    this.systemPrompt = this.createSystemPrompt();
    this.rebuildTools();
  }

  /**
   * Check if a tool category is enabled
   */
  public isToolEnabled(toolCategory: keyof ToolConfiguration): boolean {
    return this.toolConfig[toolCategory] === true;
  }

  /**
   * Get current file system root directory
   */
  public getFileSystemRoot(): string {
    return this.fileSystemRootDir;
  }

  /**
   * Get available file system tools
   */
  public getFileSystemTools(): string[] {
    return this.fileSystemTools.map(tool => tool.name);
  }

  /**
   * Get available web search tools
   */
  public getWebSearchTools(): string[] {
    return this.webSearchTools.map(tool => tool.name);
  }

  /**
   * Get available banbury tools
   */
  public getBanburyTools(): string[] {
    return this.banburyTools.map(tool => tool.name);
  }

  /**
   * Get available Gmail tools
   */
  public getGmailTools(): string[] {
    return this.gmailTools.map(tool => tool.name);
  }

  /**
   * Get available Google Calendar tools
   */
  public getGoogleCalendarTools(): string[] {
    return this.googleCalendarTools.map(tool => tool.name);
  }

  /**
   * Get all available tools
   */
  public getAllTools(): string[] {
    return this.allTools.map(tool => tool.name);
  }

  /**
   * Non-streaming chat
   */
  public async chat(messages: AgentMessage[]): Promise<string> {
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
   * Create a prompt template chain (for advanced chaining)
   */
  public createPromptChain(template: string) {
    const promptTemplate = ChatPromptTemplate.fromTemplate(template);
    return promptTemplate.pipe(this.llm);
  }

  /**
   * Multimodal support - handle images in messages
   */
  public async chatWithImages(
    messages: AgentMessage[],
    callbacks?: AgentStreamCallback,
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
      return this.chatStream(messages, callbacks);
    } else {
      const response = await this.llm.invoke(multimodalMessages);
      return response.content as string;
    }
  }

  /**
   * Helper to convert single message to LangChain format
   */
  private convertMessageToLangChain(msg: AgentMessage) {
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

    const modelWithTools = this.llm.bindTools(this.allTools);
    const response = await modelWithTools.invoke(langchainMessages);

    return {
      usedTools: !!(response.tool_calls && response.tool_calls.length > 0),
      toolNames: response.tool_calls?.map((tc: any) => tc.name)
    };
  }
} 
