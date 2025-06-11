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

export interface ToolConfig {
  basic?: boolean;
  webSearch?: boolean;
  codingTools?: boolean;
  fileSystemRead?: boolean;
  fileSystemWrite?: boolean;
  commandExecution?: boolean;
  gmail?: boolean;
  googleCalendar?: boolean;
  banburyMCP?: boolean;
}

export class Agent {
  private basicTools: DynamicStructuredTool[];
  private webSearchTools: DynamicStructuredTool[];
  private codingTools: DynamicStructuredTool[];
  private fileSystemReadTools: DynamicStructuredTool[];
  private fileSystemWriteTools: DynamicStructuredTool[];
  private commandExecutionTools: DynamicStructuredTool[];
  private gmailTools: DynamicStructuredTool[];
  private googleCalendarTools: DynamicStructuredTool[];
  private banburyMCPTools: DynamicStructuredTool[];
  private allTools: DynamicStructuredTool[];
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

  constructor(private toolConfig: ToolConfig = {}) {
    // Initialize all tools based on config
    this.basicTools = this.toolConfig.basic ? createBasicTools() : [];
    this.webSearchTools = this.toolConfig.webSearch ? createWebSearchTools() : [];
    this.codingTools = this.toolConfig.codingTools ? createCodingTools() : [];
    this.fileSystemReadTools = this.toolConfig.fileSystemRead ? createFileSystemReadTools() : [];
    this.fileSystemWriteTools = this.toolConfig.fileSystemWrite ? createFileSystemWriteTools() : [];
    this.commandExecutionTools = this.toolConfig.commandExecution ? createCommandExecutionTools() : [];
    this.gmailTools = this.toolConfig.gmail ? createGmailTools(this.toolConfig.gmail) : [];
    this.googleCalendarTools = this.toolConfig.googleCalendar ? createGoogleCalendarTools(this.toolConfig.googleCalendar) : [];
    this.banburyMCPTools = this.toolConfig.banburyMCP ? createBanburyMCPTools() : [];

    // Combine all tools
    this.allTools = [
      ...this.basicTools,
      ...this.webSearchTools,
      ...this.codingTools,
      ...this.fileSystemReadTools,
      ...this.fileSystemWriteTools,
      ...this.commandExecutionTools,
      ...this.gmailTools,
      ...this.googleCalendarTools,
      ...this.banburyMCPTools
    ];

    this.rebuildTools();
  }

  private rebuildTools() {
    this.banburyTools = this.toolConfig.banbury ? createBanburyTools(this.mcpClient) : [];
    this.fileSystemTools = this.toolConfig.filesystem ? createFileSystemTools(this.fileSystemRootDir) : [];
    this.webSearchTools = this.toolConfig.webSearch ? createWebSearchTools(this.webSearchService, this.toolConfig.webSearch) : [];
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
}