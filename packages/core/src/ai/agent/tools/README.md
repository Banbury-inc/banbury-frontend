# Agent Tools Documentation

This directory contains tool integrations for the AI Agent system. Each tool file provides specific functionality that the AI can use to interact with external services and systems.

## Available Tools

### Gmail Tools (`gmailTools.ts`)

Gmail tools provide email management capabilities using the Gmail API through LangChain community tools.

#### Setup Requirements

To use Gmail tools, you need to:

1. **Create a Google Cloud Project**: Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project
2. **Enable Gmail API**: In the API Library, search for and enable the Gmail API
3. **Create Credentials**: 
   - Go to Credentials > Create Credentials > OAuth 2.0 Client IDs
   - Configure the OAuth consent screen
   - Download the `credentials.json` file
4. **Set Environment Variables**:
   ```bash
   export GOOGLE_CREDENTIALS="$(cat path/to/credentials.json)"
   # or
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"
   ```

#### Available Gmail Operations

- **GmailSearch**: Search emails using Gmail query syntax
  - `from:sender@email.com` - Search by sender
  - `subject:keyword` - Search by subject
  - `is:unread` - Get unread emails
  - `has:attachment` - Emails with attachments

- **GmailGetMessage**: Get specific email details by message ID
- **GmailGetThread**: Get entire email conversation by thread ID  
- **GmailCreateDraft**: Create draft emails
- **GmailSendMessage**: Send email messages

#### Usage in Agent

```typescript
const agent = new Agent(
  'http://localhost:11434',
  'qwen3:latest',
  mcpClient,
  undefined,
  {
    webSearch: true,
    banbury: true,
    filesystem: false,
    gmail: true, // Enable Gmail tools
    googleCalendar: false,
    googleDrive: false,
    googleTasks: false
  }
);

// Gmail tools will be automatically available when gmail: true
```

#### Example Prompts

- "Search for emails from john@example.com"
- "Show me my unread emails"
- "Get the email with ID xyz123"
- "Create a draft email to sarah@company.com about the meeting"
- "Send an email to the team about the project update"

### File System Tools (`filesystemTools.ts`)

Provides secure file system operations within a specified root directory.

### Web Search Tools (`webSearchTools.ts`)

Enables web search capabilities for real-time information.

### Banbury Tools (`banburyTools.ts`)

Integration with the Banbury MCP server for device and system management.

## Tool Configuration

Tools are enabled/disabled through the `ToolConfiguration` interface:

```typescript
interface ToolConfiguration {
  webSearch: boolean;
  banbury: boolean;
  filesystem: boolean;
  gmail?: boolean;
  googleCalendar?: boolean;
  googleDrive?: boolean;
  googleTasks?: boolean;
}
```

## Error Handling

All tools include proper error handling and will gracefully fall back to informational messages when:
- Required credentials are not configured
- API services are unavailable
- Invalid parameters are provided

## Security Considerations

- File system tools are restricted to a specified root directory
- Gmail tools require proper OAuth 2.0 authentication
- All tools validate input parameters before execution
- Sensitive operations require explicit user confirmation 