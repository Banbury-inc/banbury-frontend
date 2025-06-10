import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { BanburyMcpClient, McpToolResult } from './tools/BanburyMcpClient';
import { ToolCall } from './BasicClient';
import { WebSearchService } from './web-search';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface LangChainStreamCallback {
  onToken?: (token: string) => void;
  onThinking?: (thinking: string) => void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
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
  private mcpClient: BanburyMcpClient | null;
  private webSearchService: WebSearchService;
  private systemPrompt: string;
  private banburyTools: any[] = [];
  private fileSystemTools: any[] = [];
  private webSearchTools: any[] = [];
  private allTools: any[] = [];
  private toolsMap: Map<string, any> = new Map(); // For quick tool lookup
  private baseUrl: string;
  private model: string;
  private llmWithTools: any ;
  private fileSystemRootDir: string;
  private webSearchEnabled: boolean = false;

  constructor(
    ollamaBaseUrl: string = 'http://localhost:11434',
    model: string = 'qwen3:latest',
    mcpClient: BanburyMcpClient | null = null,
    fileSystemRootDir: string = os.homedir() // Default to user's home directory
  ) {
    this.baseUrl = ollamaBaseUrl;
    this.model = model;
    this.fileSystemRootDir = fileSystemRootDir;
    this.webSearchService = new WebSearchService();
    
    this.llm = new ChatOllama({
      baseUrl: ollamaBaseUrl,
      model: model,
      temperature: 0.7,
    });
    
    this.mcpClient = mcpClient;
    this.systemPrompt = this.createSystemPrompt();
    this.banburyTools = this.createBanburyTools();
    this.fileSystemTools = this.createFileSystemTools();
    this.webSearchTools = this.createWebSearchTools();
    this.allTools = [...this.banburyTools, ...this.fileSystemTools, ...this.webSearchTools];
    this.populateToolsMap();
    this.llmWithTools = this.llm.bindTools(this.allTools);
  }

  private createSystemPrompt(): string {
    const webSearchInfo = this.webSearchEnabled ? `

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

**Available Banbury Tools (use only when needed):**
- banbury-get-scanned-folders: Get all monitored directory locations
- banbury-get-random-files: Get random file samples from monitored system
- banbury-get-device-info: Get comprehensive device information and status
- banbury-get-sessions: Get current active sessions and task information
- banbury-add-task: Create new tasks in the system queue

**Available File System Tools (use only when needed):**
- file_read_tool: Read contents of a file
- file_write_tool: Write text content to a file
- file_list_directory_tool: List files and directories in a path
- file_copy_tool: Copy files from one location to another
- file_move_tool: Move/rename files
- file_delete_tool: Delete files or directories
- file_search_tool: Search for files matching patterns${webSearchInfo}

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
      async () => {
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
   * Create File System tools using proper LangChain tool definitions with Zod schemas
   * Following the same pattern as Python's FileManagementToolkit
   */
  private createFileSystemTools() {
    // Helper function to resolve and validate paths
    const resolvePath = (inputPath: string): string => {
      // Resolve relative paths against the root directory
      const resolvedPath = path.isAbsolute(inputPath) 
        ? inputPath 
        : path.resolve(this.fileSystemRootDir, inputPath);
      
      // Ensure the path is within the allowed root directory
      if (!resolvedPath.startsWith(this.fileSystemRootDir)) {
        throw new Error(`Access denied: Path must be within ${this.fileSystemRootDir}`);
      }
      
      return resolvedPath;
    };

    const readFileTool = tool(
      async ({ file_path }) => {
        try {
          const resolvedPath = resolvePath(file_path);
          const content = fs.readFileSync(resolvedPath, 'utf-8');
          return `File contents of ${file_path}:\n\n${content}`;
        } catch (error) {
          return `Error reading file ${file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
      {
        name: "file_read_tool",
        description: "Read the contents of a file",
        schema: z.object({
          file_path: z.string().describe("Path to the file to read"),
        }),
      }
    );

    const writeFileTool = tool(
      async ({ file_path, text }) => {
        try {
          const resolvedPath = resolvePath(file_path);
          // Ensure the directory exists
          fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
          fs.writeFileSync(resolvedPath, text, 'utf-8');
          return `File written successfully to ${file_path}`;
        } catch (error) {
          return `Error writing file ${file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
      {
        name: "file_write_tool",
        description: "Write text content to a file",
        schema: z.object({
          file_path: z.string().describe("Path to the file to write"),
          text: z.string().describe("Text content to write to the file"),
        }),
      }
    );

    const listDirectoryTool = tool(
      async ({ directory_path = "." }) => {
        try {
          const resolvedPath = resolvePath(directory_path);
          const items = fs.readdirSync(resolvedPath, { withFileTypes: true });
          
          const result = items.map(item => {
            return `${item.isDirectory() ? 'DIR' : 'FILE'}: ${item.name}`;
          });
          
          return `Contents of ${directory_path}:\n${result.join('\n')}`;
        } catch (error) {
          return `Error listing directory ${directory_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
      {
        name: "file_list_directory_tool",
        description: "List files and directories in a specified path",
        schema: z.object({
          directory_path: z.string().optional().default(".").describe("Path to the directory to list (default: current directory)"),
        }),
      }
    );

    const copyFileTool = tool(
      async ({ source_path, destination_path }) => {
        try {
          const resolvedSource = resolvePath(source_path);
          const resolvedDest = resolvePath(destination_path);
          
          // Ensure destination directory exists
          fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });
          fs.copyFileSync(resolvedSource, resolvedDest);
          
          return `File copied successfully from ${source_path} to ${destination_path}`;
        } catch (error) {
          return `Error copying file: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
      {
        name: "file_copy_tool",
        description: "Copy a file from source to destination",
        schema: z.object({
          source_path: z.string().describe("Path to the source file"),
          destination_path: z.string().describe("Path to the destination file"),
        }),
      }
    );

    const moveFileTool = tool(
      async ({ source_path, destination_path }) => {
        try {
          const resolvedSource = resolvePath(source_path);
          const resolvedDest = resolvePath(destination_path);
          
          // Ensure destination directory exists
          fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });
          fs.renameSync(resolvedSource, resolvedDest);
          
          return `File moved successfully from ${source_path} to ${destination_path}`;
        } catch (error) {
          return `Error moving file: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
      {
        name: "file_move_tool",
        description: "Move or rename a file from source to destination",
        schema: z.object({
          source_path: z.string().describe("Path to the source file"),
          destination_path: z.string().describe("Path to the destination file"),
        }),
      }
    );

    const deleteFileTool = tool(
      async ({ file_path }) => {
        try {
          const resolvedPath = resolvePath(file_path);
          const stats = fs.statSync(resolvedPath);
          
          if (stats.isDirectory()) {
            fs.rmSync(resolvedPath, { recursive: true, force: true });
            return `Directory ${file_path} deleted successfully`;
          } else {
            fs.unlinkSync(resolvedPath);
            return `File ${file_path} deleted successfully`;
          }
        } catch (error) {
          return `Error deleting ${file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
      {
        name: "file_delete_tool",
        description: "Delete a file or directory",
        schema: z.object({
          file_path: z.string().describe("Path to the file or directory to delete"),
        }),
      }
    );

    const searchFilesTool = tool(
      async ({ directory_path = ".", pattern, file_extension }) => {
        try {
          const resolvedPath = resolvePath(directory_path);
          const results: string[] = [];
          
          const searchRecursive = (currentPath: string) => {
            const items = fs.readdirSync(currentPath, { withFileTypes: true });
            
            for (const item of items) {
              const itemFullPath = path.join(currentPath, item.name);
              const relativePath = path.relative(this.fileSystemRootDir, itemFullPath);
              
              if (item.isDirectory()) {
                try {
                  searchRecursive(itemFullPath);
                } catch (error) {
                  console.error(`Error reading directory ${itemFullPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              } else {
                let matches = true;
                
                if (pattern && !item.name.toLowerCase().includes(pattern.toLowerCase())) {
                  matches = false;
                }
                
                if (file_extension && !item.name.toLowerCase().endsWith(file_extension.toLowerCase())) {
                  matches = false;
                }
                
                if (matches) {
                  results.push(relativePath);
                }
              }
            }
          };
          
          searchRecursive(resolvedPath);
          
          if (results.length === 0) {
            return `No files found matching the criteria in ${directory_path}`;
          }
          
          return `Found ${results.length} files:\n${results.join('\n')}`;
        } catch (error) {
          return `Error searching files: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
      {
        name: "file_search_tool",
        description: "Search for files in a directory by name pattern or extension",
        schema: z.object({
          directory_path: z.string().optional().default(".").describe("Directory to search in"),
          pattern: z.string().optional().describe("Text pattern to search for in filenames"),
          file_extension: z.string().optional().describe("File extension to filter by (e.g., '.txt', '.js')"),
        }),
      }
    );

    return [
      readFileTool,
      writeFileTool,
      listDirectoryTool,
      copyFileTool,
      moveFileTool,
      deleteFileTool,
      searchFilesTool
    ];
  }

  /**
   * Create Web Search tools using proper LangChain tool definitions with Zod schemas
   */
  private createWebSearchTools() {
    if (!this.webSearchEnabled) {
      return [];
    }

    const webSearchTool = tool(
      async ({ query, maxResults = 5 }) => {
        try {
          if (!query || query.trim().length === 0) {
            return 'Error: Search query is required';
          }

          const searchResults = await this.webSearchService.search(query, maxResults);
          
          if (searchResults.length === 0) {
            return `No web search results found for query: "${query}"`;
          }

          const resultText = searchResults.map((result, index) => 
            `**${index + 1}. ${result.title}**\n${result.snippet}\nSource: ${result.link}`
          ).join('\n\n');

          return `Web search results for "${query}":\n\n${resultText}`;
        } catch (error) {
          return `Error performing web search: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
      {
        name: "web_search_tool",
        description: "Search the web for current information, news, facts, or any query that requires up-to-date information",
        schema: z.object({
          query: z.string().describe("Search query string"),
          maxResults: z.number().optional().default(5).describe("Maximum number of results to return (default: 5)"),
        }),
      }
    );

    return [webSearchTool];
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
    messages: LangChainMessage[],
    callbacks: LangChainStreamCallback = {},
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
    callbacks: LangChainStreamCallback
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
   * Uses the proper LangChain tool.invoke(toolCall) pattern as per documentation
   */
  private async executeToolChain(
    messages: any[],
    initialResponse: any,
    callbacks: LangChainStreamCallback
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
    this.banburyTools = this.createBanburyTools();
    this.fileSystemTools = this.createFileSystemTools();
    this.webSearchTools = this.createWebSearchTools();
    this.allTools = [...this.banburyTools, ...this.fileSystemTools, ...this.webSearchTools];
    this.populateToolsMap();
    this.llmWithTools = this.llm.bindTools(this.allTools);
  }

  /**
   * Update the file system root directory
   */
  public setFileSystemRoot(rootDir: string) {
    this.fileSystemRootDir = rootDir;
    this.fileSystemTools = this.createFileSystemTools();
    this.allTools = [...this.banburyTools, ...this.fileSystemTools, ...this.webSearchTools];
    this.populateToolsMap();
    this.llmWithTools = this.llm.bindTools(this.allTools);
  }

  /**
   * Enable or disable web search functionality
   */
  public setWebSearchEnabled(enabled: boolean) {
    this.webSearchEnabled = enabled;
    this.systemPrompt = this.createSystemPrompt(); // Rebuild system prompt
    this.webSearchTools = this.createWebSearchTools();
    this.allTools = [...this.banburyTools, ...this.fileSystemTools, ...this.webSearchTools];
    this.populateToolsMap();
    this.llmWithTools = this.llm.bindTools(this.allTools);
  }

  /**
   * Check if web search is enabled
   */
  public isWebSearchEnabled(): boolean {
    return this.webSearchEnabled;
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
   * Get all available tools
   */
  public getAllTools(): string[] {
    return this.allTools.map(tool => tool.name);
  }

  /**
   * Non-streaming chat
   */
  public async chat(messages: LangChainMessage[]): Promise<string> {
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
    messages: LangChainMessage[],
    callbacks?: LangChainStreamCallback,
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

    const modelWithTools = this.llm.bindTools(this.allTools);
    const response = await modelWithTools.invoke(langchainMessages);

    return {
      usedTools: !!(response.tool_calls && response.tool_calls.length > 0),
      toolNames: response.tool_calls?.map((tc: any) => tc.name)
    };
  }
} 
