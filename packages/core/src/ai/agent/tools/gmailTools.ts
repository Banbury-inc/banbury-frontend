import { createSimpleTool, convertToLangChainTool, createToolParameter } from './simplifiedTools';
import { checkGoogleDriveCredentials } from '../../../files/googleDrive';
import { config } from '../../../config/config';
import { loadGlobalAxiosCredentials } from '../../../middleware/axiosGlobalHeader';
import axios from 'axios';

/**
 * Check if Gmail/Google credentials are available
 */
const checkGmailCredentials = async (): Promise<{
  hasCredentials: boolean;
  message?: string;
}> => {
  try {
    const credentialStatus = await checkGoogleDriveCredentials();
    return {
      hasCredentials: credentialStatus.hasCredentials,
      message: credentialStatus.hasCredentials 
        ? 'Gmail integration ready - using your existing Google credentials'
        : 'Gmail requires Google authentication. Please configure Google Drive integration first to enable Gmail.'
    };
  } catch (error) {
    console.error('Error checking Gmail credentials:', error);
    return {
      hasCredentials: false,
      message: 'Failed to check Gmail credentials'
    };
  }
};

/**
 * Make Gmail API request using the backend
 */
const makeGmailRequest = async (endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) => {
  try {
    const { token, apiKey } = loadGlobalAxiosCredentials();
    const effectiveApiKey = apiKey || 'dev_key_1';

    const response = await axios({
      method,
      url: `${config.url}/files/gmail/${endpoint}`,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-API-Key': effectiveApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data;
  } catch (error) {
    console.error(`Gmail API request failed:`, error);
    throw error;
  }
};

/**
 * Create Gmail tools using simplified tool definitions
 */
export function createGmailTools(enabled: boolean): any[] {
  if (!enabled) {
    return [];
  }

  // Gmail Search Tool
  const searchTool = createSimpleTool(
    'GmailSearch',
    'Search for emails in Gmail using Gmail query syntax. Returns a list of matching emails with basic information.',
    {
      query: createToolParameter('string', 'Gmail search query (e.g., "from:sender@example.com", "subject:urgent", "is:unread", "has:attachment")', { required: true }),
      maxResults: createToolParameter('number', 'Maximum number of results to return', { default: 100, optional: true })
    },
    async (params: { query: string; maxResults?: number }) => {
      try {
        const credentialCheck = await checkGmailCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Gmail not available: ${credentialCheck.message}`;
        }

        const result = await makeGmailRequest(`search?q=${encodeURIComponent(params.query)}&maxResults=${params.maxResults || 100}`);
        
        if (!result.messages || result.messages.length === 0) {
          return `No emails found matching query: "${params.query}"`;
        }

        const emailSummaries = result.messages.map((msg: any) => ({
          id: msg.id,
          threadId: msg.threadId,
          subject: msg.subject || 'No Subject',
          from: msg.from || 'Unknown Sender',
          date: msg.date || 'Unknown Date',
          snippet: msg.snippet || 'No preview available'
        }));

        const summary = emailSummaries.map((email: any, index: number) => 
          `${index + 1}. **${email.subject}**\n   From: ${email.from}\n   Date: ${email.date}\n   Preview: ${email.snippet}\n   ID: ${email.id}`
        ).join('\n\n');

        return `Found ${emailSummaries.length} emails matching "${params.query}":\n\n${summary}`;
      } catch (error) {
        return `Error searching Gmail: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Gmail Read Tool
  const readTool = createSimpleTool(
    'GmailRead',
    'Read the full content of a specific Gmail message by its ID.',
    {
      messageId: createToolParameter('string', 'Gmail message ID to read', { required: true })
    },
    async (params: { messageId: string }) => {
      try {
        const credentialCheck = await checkGmailCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Gmail not available: ${credentialCheck.message}`;
        }

        const result = await makeGmailRequest(`message/${params.messageId}`);
        
        return `**Email Details:**\n\n**Subject:** ${result.subject || 'No Subject'}\n**From:** ${result.from || 'Unknown'}\n**To:** ${result.to || 'Unknown'}\n**Date:** ${result.date || 'Unknown'}\n\n**Body:**\n${result.body || 'No content available'}`;
      } catch (error) {
        return `Error reading email: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Gmail Send Tool
  const sendTool = createSimpleTool(
    'GmailSend',
    'Send an email through Gmail.',
    {
      to: createToolParameter('string', 'Recipient email address', { required: true }),
      subject: createToolParameter('string', 'Email subject', { required: true }),
      body: createToolParameter('string', 'Email body content', { required: true }),
      cc: createToolParameter('string', 'CC recipients (optional)', { optional: true }),
      bcc: createToolParameter('string', 'BCC recipients (optional)', { optional: true })
    },
    async (params: { to: string; subject: string; body: string; cc?: string; bcc?: string }) => {
      try {
        const credentialCheck = await checkGmailCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Gmail not available: ${credentialCheck.message}`;
        }

        const emailData = {
          to: params.to,
          subject: params.subject,
          body: params.body,
          ...(params.cc && { cc: params.cc }),
          ...(params.bcc && { bcc: params.bcc })
        };

        await makeGmailRequest('send', 'POST', emailData);
        
        return `Email sent successfully to ${params.to} with subject "${params.subject}"`;
      } catch (error) {
        return `Error sending email: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Gmail Labels Tool
  const labelsTool = createSimpleTool(
    'GmailLabels',
    'Get all available Gmail labels/folders.',
    {},
    async () => {
      try {
        const credentialCheck = await checkGmailCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Gmail not available: ${credentialCheck.message}`;
        }

        const result = await makeGmailRequest('labels');
        
        if (!result.labels || result.labels.length === 0) {
          return 'No labels found in Gmail';
        }

        const labelList = result.labels.map((label: any, index: number) => 
          `${index + 1}. ${label.name} (${label.id})`
        ).join('\n');

        return `Available Gmail labels:\n\n${labelList}`;
      } catch (error) {
        return `Error fetching labels: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Gmail Drafts Tool
  const draftsTool = createSimpleTool(
    'GmailDrafts',
    'Get Gmail draft messages.',
    {
      maxResults: createToolParameter('number', 'Maximum number of drafts to return', { default: 10, optional: true })
    },
    async (params: { maxResults?: number }) => {
      try {
        const credentialCheck = await checkGmailCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Gmail not available: ${credentialCheck.message}`;
        }

        const result = await makeGmailRequest(`drafts?maxResults=${params.maxResults || 10}`);
        
        if (!result.drafts || result.drafts.length === 0) {
          return 'No drafts found in Gmail';
        }

        const draftSummaries = result.drafts.map((draft: any, index: number) => 
          `${index + 1}. **${draft.subject || 'No Subject'}**\n   To: ${draft.to || 'Unknown'}\n   Last Modified: ${draft.date || 'Unknown'}\n   ID: ${draft.id}`
        ).join('\n\n');

        return `Found ${result.drafts.length} drafts:\n\n${draftSummaries}`;
      } catch (error) {
        return `Error fetching drafts: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Convert simplified tools to LangChain-compatible format
  return [
    convertToLangChainTool(searchTool),
    convertToLangChainTool(readTool),
    convertToLangChainTool(sendTool),
    convertToLangChainTool(labelsTool),
    convertToLangChainTool(draftsTool)
  ];
} 
