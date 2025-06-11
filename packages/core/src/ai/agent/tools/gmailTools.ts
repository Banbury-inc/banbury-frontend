import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { checkGoogleDriveCredentials } from '../../../files/googleDrive';
import { config } from '../../../config/config';
import { loadGlobalAxiosCredentials } from '../../../middleware/axiosGlobalHeader';
import axios from 'axios';


/**
 * Check if Gmail/Google credentials are available
 * Since Gmail uses the same Google API credentials as Google Drive,
 * we check for Google Drive credentials
 */
const checkGmailCredentials = async (): Promise<{
  hasCredentials: boolean;
  message?: string;
}> => {
  try {
    // Use the same credential check as Google Drive since they share credentials
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
 * Create Gmail tools that use the existing Google Drive credentials
 */
export function createGmailTools(enabled: boolean): DynamicStructuredTool[] {
  if (!enabled) {
    return [];
  }

  const tools: DynamicStructuredTool[] = [];

  // Gmail Search Tool
  tools.push(
    new DynamicStructuredTool({
      name: 'GmailSearch',
      description: 'Search for emails in Gmail using Gmail query syntax. Returns a list of matching emails with basic information.',
      schema: z.object({
        query: z.string().describe('Gmail search query (e.g., "from:sender@example.com", "subject:urgent", "is:unread", "has:attachment")'),
        maxResults: z.number().optional().default(100).describe('Maximum number of results to return'),
      }),
      func: async ({ query, maxResults = 100 }) => {
        try {
          const credentialCheck = await checkGmailCredentials();
          if (!credentialCheck.hasCredentials) {
            return `Gmail not available: ${credentialCheck.message}`;
          }

          const result = await makeGmailRequest(`search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
          
          if (!result.messages || result.messages.length === 0) {
            return `No emails found matching query: "${query}"`;
          }

          const emailSummaries = result.messages.map((msg: any) => ({
            id: msg.id,
            threadId: msg.threadId,
            snippet: msg.snippet,
            subject: msg.subject || 'No subject',
            from: msg.from || 'Unknown sender',
            date: msg.date || 'Unknown date'
          }));

          return `Found ${emailSummaries.length} emails matching "${query}":\n\n${
            emailSummaries.map((email: any, index: number) => 
              `${index + 1}. Subject: ${email.subject}\n   From: ${email.from}\n   Date: ${email.date}\n   Snippet: ${email.snippet}\n   Message ID: ${email.id}\n`
            ).join('\n')
          }`;

        } catch (error) {
          return `Error searching Gmail: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  // Gmail Get Message Tool
  tools.push(
    new DynamicStructuredTool({
      name: 'GmailGetMessage',
      description: 'Get the full content of a specific email message by its ID.',
      schema: z.object({
        messageId: z.string().describe('The unique ID of the email message to retrieve'),
      }),
      func: async ({ messageId }) => {
        try {
          const credentialCheck = await checkGmailCredentials();
          if (!credentialCheck.hasCredentials) {
            return `Gmail not available: ${credentialCheck.message}`;
          }

          const result = await makeGmailRequest(`message/${messageId}`);
          
          return `Email Details:
Subject: ${result.subject || 'No subject'}
From: ${result.from || 'Unknown sender'}
To: ${result.to || 'Unknown recipient'}
Date: ${result.date || 'Unknown date'}
Message ID: ${result.id}
Thread ID: ${result.threadId}

Content:
${result.body || 'No content available'}`;

        } catch (error) {
          return `Error retrieving email: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  // Gmail Get Thread Tool
  tools.push(
    new DynamicStructuredTool({
      name: 'GmailGetThread',
      description: 'Get all messages in an email thread/conversation by thread ID.',
      schema: z.object({
        threadId: z.string().describe('The unique ID of the email thread to retrieve'),
      }),
      func: async ({ threadId }) => {
        try {
          const credentialCheck = await checkGmailCredentials();
          if (!credentialCheck.hasCredentials) {
            return `Gmail not available: ${credentialCheck.message}`;
          }

          const result = await makeGmailRequest(`thread/${threadId}`);
          
          if (!result.messages || result.messages.length === 0) {
            return `No messages found in thread: ${threadId}`;
          }

          const threadSummary = result.messages.map((msg: any, index: number) => 
            `Message ${index + 1}:
Subject: ${msg.subject || 'No subject'}
From: ${msg.from || 'Unknown sender'}
Date: ${msg.date || 'Unknown date'}
Snippet: ${msg.snippet || 'No preview available'}
Message ID: ${msg.id}

`
          ).join('\n');

          return `Email Thread (${result.messages.length} messages):\n\n${threadSummary}`;

        } catch (error) {
          return `Error retrieving thread: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  // Gmail Create Draft Tool
  tools.push(
    new DynamicStructuredTool({
      name: 'GmailCreateDraft',
      description: 'Create a draft email message that can be edited and sent later.',
      schema: z.object({
        to: z.string().describe('Recipient email address'),
        subject: z.string().describe('Email subject line'),
        body: z.string().describe('Email body content'),
        cc: z.string().optional().describe('CC email addresses (comma-separated)'),
        bcc: z.string().optional().describe('BCC email addresses (comma-separated)'),
      }),
      func: async ({ to, subject, body, cc, bcc }) => {
        try {
          const credentialCheck = await checkGmailCredentials();
          if (!credentialCheck.hasCredentials) {
            return `Gmail not available: ${credentialCheck.message}`;
          }

          const draftData = {
            to,
            subject,
            body,
            cc,
            bcc
          };

          const result = await makeGmailRequest('draft', 'POST', draftData);
          
          return `Draft created successfully!
Draft ID: ${result.id}
To: ${to}
Subject: ${subject}
Status: Draft saved - you can edit and send it from Gmail`;

        } catch (error) {
          return `Error creating draft: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  // Gmail Send Message Tool
  tools.push(
    new DynamicStructuredTool({
      name: 'GmailSendMessage',
      description: 'Send an email message immediately.',
      schema: z.object({
        to: z.string().describe('Recipient email address'),
        subject: z.string().describe('Email subject line'),
        body: z.string().describe('Email body content'),
        cc: z.string().optional().describe('CC email addresses (comma-separated)'),
        bcc: z.string().optional().describe('BCC email addresses (comma-separated)'),
      }),
      func: async ({ to, subject, body, cc, bcc }) => {
        try {
          const credentialCheck = await checkGmailCredentials();
          if (!credentialCheck.hasCredentials) {
            return `Gmail not available: ${credentialCheck.message}`;
          }

          const messageData = {
            to,
            subject,
            body,
            cc,
            bcc
          };

          const result = await makeGmailRequest('send', 'POST', messageData);
          
          return `Email sent successfully!
Message ID: ${result.id}
To: ${to}
Subject: ${subject}
Status: Delivered`;

        } catch (error) {
          return `Error sending email: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  return tools;
} 
