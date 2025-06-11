# Gmail Integration for Banbury AI Agent

## Overview

Gmail integration has been successfully added to the Banbury AI Agent system, allowing users to interact with their Gmail account through the AI agent. This integration uses LangChain's community Gmail tools to provide email management capabilities.

## Features

The Gmail integration provides the following capabilities:

- **Email Search**: Search emails using Gmail query syntax
- **Message Retrieval**: Get specific email messages by ID
- **Thread Management**: Access entire email conversations
- **Draft Creation**: Create draft emails
- **Email Sending**: Send emails directly from the AI agent

## Setup Instructions

### 1. Navigate to Integrations Settings

1. Open Banbury application
2. Go to **Settings** → **Integrations**
3. Find the **Gmail** integration in the "Available Integrations" tab

### 2. Configure Gmail Integration

1. Click **Configure** on the Gmail integration card
2. Enter your Gmail client email address in the dialog
3. Click **Configure Gmail** to save the configuration

### 3. Verify Integration Status

Once configured, Gmail will appear in the "Installed Integrations" tab with an "Active" status.

## Usage

### Enable Gmail Tools in AI Agent

1. Go to the **AI** page
2. Open the **Model Selector** toolbar
3. Enable the **Gmail** toggle in the available tools section

### Example AI Prompts

Once Gmail integration is enabled, you can use prompts like:

- "Search for emails from john@example.com"
- "Show me my unread emails"
- "Get the email with ID xyz123"
- "Create a draft email to sarah@company.com about the meeting"
- "Send an email to the team about the project update"
- "Find emails with subject containing 'urgent'"
- "Show me emails from last week"

### Gmail Search Syntax

The AI agent supports Gmail's advanced search syntax:

- `from:sender@email.com` - Search by sender
- `to:recipient@email.com` - Search by recipient
- `subject:keyword` - Search by subject
- `is:unread` - Get unread emails
- `is:read` - Get read emails
- `has:attachment` - Emails with attachments
- `after:2024/01/01` - Emails after specific date
- `before:2024/12/31` - Emails before specific date
- `label:important` - Emails with specific labels

## Technical Implementation

### Backend Components

- **Gmail Integration Status**: Stored in localStorage
- **Settings API**: New methods for Gmail configuration
  - `getGmailIntegrationStatus()`
  - `enableGmailIntegration(clientEmail)`
  - `disableGmailIntegration()`
  - `isGmailEnabled()`

### Frontend Components

- **Integrations UI**: Gmail configuration and management interface
- **AI Agent Integration**: Gmail tools available when enabled
- **Status Management**: Real-time status updates and error handling

### LangChain Tools

The integration uses the following LangChain community tools:

- `GmailSearch` - Search emails
- `GmailGetMessage` - Retrieve specific messages
- `GmailGetThread` - Get email threads
- `GmailCreateDraft` - Create draft emails
- `GmailSendMessage` - Send emails

## Prerequisites

### Required Dependencies

The following packages are required and have been installed:

- `@langchain/community` - LangChain community tools
- `googleapis` - Google APIs client library
- `google-auth-library` - Google authentication

### Authentication Setup (Future Enhancement)

Currently, the integration stores the client email locally. For full functionality, you would need to:

1. Set up Google Cloud Project
2. Enable Gmail API
3. Configure OAuth 2.0 credentials
4. Set environment variables for authentication

## Security Considerations

- Client email is stored locally in browser localStorage
- No sensitive credentials are stored in the application
- Full Gmail API access requires proper OAuth 2.0 setup
- Email operations are performed through the AI agent with user consent

## Troubleshooting

### Common Issues

1. **Gmail tools not available**: Ensure Gmail is enabled in AI agent tools
2. **Authentication errors**: Verify client email is correctly configured
3. **Search returns no results**: Check Gmail search syntax
4. **Console warnings about credentials**: These are expected until full API setup is complete

### Expected Behavior

- **Client Email Only**: When you configure just the client email, you'll see informational messages about setting up full API access
- **No Warnings**: The system now gracefully handles missing credentials without showing error warnings
- **Setup Information**: The AI agent will provide helpful setup instructions when Gmail tools are used

### Error Messages

- "Gmail tools are not configured": Configure Gmail in Settings → Integrations
- "Please enter a valid email address": Check email format in configuration
- "Gmail integration disabled": Re-enable in Integrations settings
- "Gmail API credentials not fully set up": Complete Google Cloud Console setup for full functionality

## Future Enhancements

Potential improvements for the Gmail integration:

1. **Full OAuth 2.0 Authentication**: Complete Google API authentication setup
2. **Email Compose UI**: Visual email composition interface
3. **Attachment Handling**: Support for email attachments
4. **Calendar Integration**: Link with Google Calendar events
5. **Advanced Filtering**: More sophisticated email filtering options
6. **Bulk Operations**: Support for bulk email actions

## Support

For issues or questions about Gmail integration:

1. Check the AI agent tools are enabled
2. Verify Gmail integration status in Settings
3. Review error messages in the application alerts
4. Restart the application if issues persist

The Gmail integration provides a powerful way to manage emails through natural language interactions with the AI agent, making email management more efficient and intuitive. 