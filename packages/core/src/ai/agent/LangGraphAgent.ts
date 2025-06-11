import { ChatOllama } from '@langchain/ollama';
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { BanburyMcpClient, McpToolResult } from '../basic/tools/banburyMCP/BanburyMcpClient';
import { ToolCall } from '../basic/BasicClient';
import { WebSearchService } from '../basic/tools/webSearch';
import { createBanburyTools } from './tools/banburyTools';
import { createFileSystemTools } from './tools/filesystemTools';
import { createWebSearchTools } from './tools/webSearchTools';
import { createGmailTools } from './tools/gmailTools';
import os from 'os';

export interface LangGraphAgentStreamCallback {
  onToken?: (token: string) => void;
  onThinking?: (thinking: string) => void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (result: McpToolResult) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export interface LangGraphAgentOptions {
  temperature?: number;
  maxRetries?: number;
}

export interface LangGraphAgentMessage {
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

export interface ModelConfig {
  provider: 'ollama' | 'anthropic';
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
  temperature?: number;
}

/**
 * LangGraph-powered AI Agent with support for both Ollama and Anthropic models
 * Uses LangGraph's createReactAgent for proper tool integration and reasoning
 */
export class LangGraphAgent {
  private llm: ChatOllama | ChatAnthropic;
  private agent: any; // LangGraph ReAct agent
  private mcpClient: BanburyMcpClient | null;
  private webSearchService: WebSearchService;
  private systemPrompt: string;
  private banburyTools: any[] = [];
  private fileSystemTools: any[] = [];
  private webSearchTools: any[] = [];
  private gmailTools: any[] = [];
  private allTools: any[] = [];
  private fileSystemRootDir: string;
  private toolConfig: ToolConfiguration;
  private modelConfig: ModelConfig;

  constructor(
    modelConfig: ModelConfig = {
      provider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'qwen3:latest',
      temperature: 0.7
    },
    mcpClient: BanburyMcpClient | null = null,
    fileSystemRootDir: string = os.homedir(),
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
    this.modelConfig = { ...modelConfig };
    this.fileSystemRootDir = fileSystemRootDir;
    this.toolConfig = toolConfig;
    this.webSearchService = new WebSearchService();
    this.mcpClient = mcpClient;
    
    // Initialize the LLM based on provider
    this.llm = this.createLLM();
    
    this.systemPrompt = this.createSystemPrompt();
    this.rebuildAgent();
  }

  private createLLM(): ChatOllama | ChatAnthropic {
    if (this.modelConfig.provider === 'anthropic') {
      // Load API key from localStorage if not provided
      const apiKey = this.modelConfig.anthropicApiKey || 
                    (typeof window !== 'undefined' ? localStorage.getItem('ANTHROPIC_API_KEY') : null);
      
      if (!apiKey) {
        throw new Error('Anthropic API key is required. Please configure it in Settings > Models.');
      }

      return new ChatAnthropic({
        apiKey: apiKey,
        model: this.modelConfig.anthropicModel || 'claude-3-5-sonnet-20241022',
        // temperature: this.modelConfig.temperature || 0.7,
        streaming: true,
        thinking: {
          type: "enabled",
          budget_tokens: 1024
        },
      });
    } else {
      // Default to Ollama
      return new ChatOllama({
        baseUrl: this.modelConfig.ollamaBaseUrl || 'http://localhost:11434',
        model: this.modelConfig.ollamaModel || 'qwen3:latest',
        temperature: this.modelConfig.temperature || 0.7,
      });
    }
  }

  private rebuildAgent() {
    this.banburyTools = this.toolConfig.banbury ? createBanburyTools(this.mcpClient) : [];
    this.fileSystemTools = this.toolConfig.filesystem ? createFileSystemTools(this.fileSystemRootDir) : [];
    this.webSearchTools = this.toolConfig.webSearch ? createWebSearchTools(this.webSearchService, this.toolConfig.webSearch) : [];
    this.gmailTools = this.toolConfig.gmail ? createGmailTools(this.toolConfig.gmail) : [];
    this.allTools = [...this.banburyTools, ...this.fileSystemTools, ...this.webSearchTools, ...this.gmailTools];
    
    // Create the LangGraph ReAct agent following LangGraph best practices
    // Let LangGraph handle tool binding and execution automatically
    this.agent = createReactAgent({
      llm: this.llm,
      tools: this.allTools,
    });
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
- GmailGetMessage: Get details of a specific email message
- GmailGetThread: Get an entire email thread/conversation
- GmailCreateDraft: Create a draft email
- GmailSendMessage: Send an email message
` : '';

    const modelInfo = this.modelConfig.provider === 'anthropic' 
      ? `\n**Current AI Model:** Anthropic ${this.modelConfig.anthropicModel || 'claude-sonnet-4-20250514'}`
      : `\n**Current AI Model:** Ollama ${this.modelConfig.ollamaModel || 'qwen3:latest'}`;

    return `You are an advanced AI assistant powered by LangGraph with structured reasoning capabilities and access to various tools through the Banbury platform.

🧠 **STRUCTURED REASONING APPROACH**

You operate using LangGraph's ReAct (Reasoning and Acting) pattern, which provides:
- Clear reasoning before taking actions
- Strategic tool selection and usage
- Iterative problem-solving with reflection

**Your workflow:**

1. **ANALYZE** the user's request thoroughly
2. **REASON** about what information or actions are needed
3. **ACT** by using appropriate tools when necessary
4. **REFLECT** on results and continue if needed
5. **RESPOND** with a comprehensive answer

**Tool Usage Principles:**
- Only use tools when they provide value to answer the user's question
- Don't use tools for general knowledge questions
- Use tools strategically for current system information, file operations, or web searches
- Handle errors gracefully and provide alternatives

**Examples of when to use tools:**
- User asks about their files or device → Use banbury tools
- User wants file operations → Use file system tools
- User asks for current information → Use web search tools
- User wants email management → Use Gmail tools

**Examples of when NOT to use tools:**
- General questions about concepts or explanations
- Programming or technology questions answerable with knowledge
- Creative writing or analysis tasks
- Casual conversation
${modelInfo}${banburyInfo}${filesystemInfo}${webSearchInfo}${gmailInfo}

**Core Principles:**
- Think systematically using the ReAct pattern
- Be efficient with tool usage
- Provide helpful responses whether tools are used or not
- Leverage LangGraph's structured reasoning for better outcomes`;
  }

  /**
   * Chat with streaming response using LangGraph agent
   * Following LangGraph best practices from https://langchain-ai.github.io/langgraph/agents/tools/
   */
  public async chatStream(
    messages: LangGraphAgentMessage[],
    callbacks: LangGraphAgentStreamCallback = {},
  ): Promise<string> {
    try {
      // Convert messages to LangGraph format
      const langGraphMessages = this.convertMessagesToLangGraph(messages);
      
      // Add system prompt
      const systemMessage = { role: 'system', content: this.systemPrompt };
      const fullMessages = [systemMessage, ...langGraphMessages];

      // Use LangGraph agent streaming - let it handle tool calling automatically
      const stream = await this.agent.stream(
        { messages: fullMessages },
        {
          streamMode: 'values',
        }
      );

      let fullResponse = '';
      let hasNotifiedThinkingStart = false;
      let isInThinkingBlock = false;
      
      for await (const chunk of stream) {
        // Extract content from the chunk
        if (chunk.messages && chunk.messages.length > 0) {
          const lastMessage = chunk.messages[chunk.messages.length - 1];
          
          if (lastMessage.content) {
            let content = typeof lastMessage.content === 'string' 
              ? lastMessage.content 
              : Array.isArray(lastMessage.content)
                ? lastMessage.content.map((block: any) => block.text || block.content || '').join('')
                : JSON.stringify(lastMessage.content);
            
            // Handle Anthropic's native thinking format
            if (Array.isArray(lastMessage.content)) {
              for (const contentBlock of lastMessage.content) {
                if (contentBlock.type === 'thinking') {
                  // Handle thinking content
                  if (!hasNotifiedThinkingStart) {
                    callbacks.onThinkingStart?.();
                    hasNotifiedThinkingStart = true;
                    isInThinkingBlock = true;
                  }
                  
                  if (contentBlock.thinking) {
                    callbacks.onThinking?.(contentBlock.thinking);
                  }
                } else if (contentBlock.type === 'text') {
                  // Handle text content
                  if (isInThinkingBlock) {
                    callbacks.onThinkingEnd?.();
                    isInThinkingBlock = false;
                  }
                  
                  if (contentBlock.text) {
                    callbacks.onToken?.(contentBlock.text);
                    fullResponse += contentBlock.text;
                  }
                }
              }
            } else {
              // Handle traditional thinking tags
              const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
              if (thinkingMatch) {
                if (!hasNotifiedThinkingStart) {
                  callbacks.onThinkingStart?.();
                  hasNotifiedThinkingStart = true;
                }
                callbacks.onThinking?.(thinkingMatch[1].trim());
                callbacks.onThinkingEnd?.();
              }
              
              // Send clean content (without thinking tags)
              const cleanContent = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
              if (cleanContent && !fullResponse.includes(cleanContent)) {
                callbacks.onToken?.(cleanContent);
                fullResponse += cleanContent;
              }
            }
          }
          
          // Handle tool calls - LangGraph manages this automatically
          if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
            for (const toolCall of lastMessage.tool_calls) {
              callbacks.onToolCall?.({
                id: toolCall.id || `tool_${Date.now()}`,
                type: 'function',
                function: {
                  name: toolCall.name || 'unknown_tool',
                  arguments: JSON.stringify(toolCall.args || {})
                }
              });
            }
          }
        }
      }

      if (isInThinkingBlock) {
        callbacks.onThinkingEnd?.();
      }

      callbacks.onComplete?.(fullResponse);
      return fullResponse;

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      callbacks.onError?.(err);
      throw err;
    }
  }

  private convertMessagesToLangGraph(messages: LangGraphAgentMessage[]) {
    return messages.map(msg => ({
      role: msg.role === 'user' ? 'human' : msg.role,
      content: msg.content,
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id })
    }));
  }

  /**
   * Update model configuration
   */
  public setModelConfig(modelConfig: Partial<ModelConfig>) {
    this.modelConfig = { ...this.modelConfig, ...modelConfig };
    this.llm = this.createLLM();
    this.systemPrompt = this.createSystemPrompt();
    this.rebuildAgent();
  }

  /**
   * Get current model configuration
   */
  public getModelConfig(): ModelConfig {
    return { ...this.modelConfig };
  }

  /**
   * Update the MCP client
   */
  public setMcpClient(mcpClient: BanburyMcpClient | null) {
    this.mcpClient = mcpClient;
    this.rebuildAgent();
  }

  /**
   * Update the file system root directory
   */
  public setFileSystemRoot(rootDir: string) {
    this.fileSystemRootDir = rootDir;
    this.rebuildAgent();
  }

  /**
   * Update tool configuration
   */
  public setToolConfiguration(toolConfig: ToolConfiguration) {
    this.toolConfig = toolConfig;
    this.systemPrompt = this.createSystemPrompt();
    this.rebuildAgent();
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
    this.rebuildAgent();
  }

  /**
   * Check if a tool category is enabled
   */
  public isToolEnabled(toolCategory: keyof ToolConfiguration): boolean {
    return this.toolConfig[toolCategory] === true;
  }

  /**
   * Get available tools
   */
  public getAllTools(): string[] {
    return this.allTools.map(tool => tool.name);
  }

  /**
   * Non-streaming chat
   */
  public async chat(messages: LangGraphAgentMessage[]): Promise<string> {
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
   * Check if Anthropic is properly configured
   */
  public isAnthropicConfigured(): boolean {
    if (this.modelConfig.provider !== 'anthropic') return true;
    
    const apiKey = this.modelConfig.anthropicApiKey || 
                  (typeof window !== 'undefined' ? localStorage.getItem('ANTHROPIC_API_KEY') : null);
    return !!apiKey;
  }

  /**
   * Get current provider info
   */
  public getProviderInfo(): { provider: string; model: string; configured: boolean } {
    const configured = this.modelConfig.provider === 'anthropic' 
      ? this.isAnthropicConfigured() 
      : true;

    const model = this.modelConfig.provider === 'anthropic'
      ? this.modelConfig.anthropicModel || 'claude-sonnet-4-20250514'
      : this.modelConfig.ollamaModel || 'qwen3:latest';

    return {
      provider: this.modelConfig.provider,
      model,
      configured
    };
  }
} 
