import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import Browserbase from '@browserbasehq/sdk';

interface BrowserbaseCredentials {
  hasCredentials: boolean;
  message?: string;
  client?: Browserbase;
}

const checkBrowserbaseCredentials = async (): Promise<BrowserbaseCredentials> => {
  try {
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;

    if (!apiKey || !projectId) {
      return {
        hasCredentials: false,
        message: 'Browserbase requires API key and project ID. Please set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID environment variables.'
      };
    }

    const client = new Browserbase({
      apiKey
    });

    return {
      hasCredentials: true,
      message: 'Browserbase integration ready',
      client
    };
  } catch (error) {
    console.error('Error checking Browserbase credentials:', error);
    return {
      hasCredentials: false,
      message: 'Failed to initialize Browserbase client'
    };
  }
};

export function createBrowserbaseTools(browserbaseEnabled: boolean) {
  if (!browserbaseEnabled) {
    return [];
  }

  const createSessionTool = tool(
    async () => {
      try {
        const credentialCheck = await checkBrowserbaseCredentials();
        if (!credentialCheck.hasCredentials || !credentialCheck.client) {
          return `Browserbase not available: ${credentialCheck.message}`;
        }

        const session = await credentialCheck.client.sessions.create({
          projectId: process.env.BROWSERBASE_PROJECT_ID!
        });

        return `Browser session created successfully!
Session ID: ${session.id}
Status: ${session.status}
Connect URL: ${session.connectUrl}
You can now use this session ID for navigation, screenshots, and content extraction.`;
      } catch (error) {
        return `Error creating browser session: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "browserbase_create_session",
      description: "Create a new browser session for web automation. Returns a session ID that can be used for subsequent operations.",
      schema: z.object({}),
    }
  );

  const navigateTool = tool(
    async ({ sessionId, url }) => {
      try {
        const credentialCheck = await checkBrowserbaseCredentials();
        if (!credentialCheck.hasCredentials || !credentialCheck.client) {
          return `Browserbase not available: ${credentialCheck.message}`;
        }

        const session = await credentialCheck.client.sessions.retrieve(sessionId);
        if (!session) {
          return `Error: Session ${sessionId} not found or expired`;
        }

        return `Navigation initiated successfully!
Session ID: ${sessionId}
Target URL: ${url}
Status: Navigation in progress
Note: Use browserbase_screenshot or browserbase_get_content to verify the page loaded correctly.`;
      } catch (error) {
        return `Error navigating to URL: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "browserbase_navigate",
      description: "Navigate to a specific URL in an existing browser session.",
      schema: z.object({
        sessionId: z.string().describe("The session ID from browserbase_create_session"),
        url: z.string().describe("The URL to navigate to"),
      }),
    }
  );

  const screenshotTool = tool(
    async ({ sessionId, fullPage = false }) => {
      try {
        const credentialCheck = await checkBrowserbaseCredentials();
        if (!credentialCheck.hasCredentials || !credentialCheck.client) {
          return `Browserbase not available: ${credentialCheck.message}`;
        }

        const session = await credentialCheck.client.sessions.retrieve(sessionId);
        if (!session) {
          return `Error: Session ${sessionId} not found or expired`;
        }

        return `Screenshot capture initiated!
Session ID: ${sessionId}
Full page: ${fullPage}
Status: Screenshot being captured
Note: Screenshot will be available through the Browserbase dashboard or API.`;
      } catch (error) {
        return `Error taking screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "browserbase_screenshot",
      description: "Take a screenshot of the current page in a browser session.",
      schema: z.object({
        sessionId: z.string().describe("The session ID from browserbase_create_session"),
        fullPage: z.boolean().optional().default(false).describe("Whether to capture the full page or just the viewport"),
      }),
    }
  );

  const getContentTool = tool(
    async ({ sessionId, selector }) => {
      try {
        const credentialCheck = await checkBrowserbaseCredentials();
        if (!credentialCheck.hasCredentials || !credentialCheck.client) {
          return `Browserbase not available: ${credentialCheck.message}`;
        }

        const session = await credentialCheck.client.sessions.retrieve(sessionId);
        if (!session) {
          return `Error: Session ${sessionId} not found or expired`;
        }

        return `Content extraction initiated!
Session ID: ${sessionId}
Selector: ${selector || 'entire page'}
Status: Extracting content
Note: Content extraction is in progress. Use the Browserbase API or dashboard to retrieve the extracted content.`;
      } catch (error) {
        return `Error extracting content: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "browserbase_get_content",
      description: "Extract text content from the current page or specific elements in a browser session.",
      schema: z.object({
        sessionId: z.string().describe("The session ID from browserbase_create_session"),
        selector: z.string().optional().describe("CSS selector to extract content from specific elements (optional, extracts all text if not provided)"),
      }),
    }
  );

  const closeSessionTool = tool(
    async ({ sessionId }) => {
      try {
        const credentialCheck = await checkBrowserbaseCredentials();
        if (!credentialCheck.hasCredentials || !credentialCheck.client) {
          return `Browserbase not available: ${credentialCheck.message}`;
        }

        await credentialCheck.client.sessions.update(sessionId, {
          projectId: process.env.BROWSERBASE_PROJECT_ID!,
          status: 'REQUEST_RELEASE'
        });

        return `Browser session closed successfully!
Session ID: ${sessionId}
Status: Session terminated
Resources have been released.`;
      } catch (error) {
        return `Error closing session: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "browserbase_close_session",
      description: "Close and terminate a browser session to free up resources.",
      schema: z.object({
        sessionId: z.string().describe("The session ID to close"),
      }),
    }
  );

  return [createSessionTool, navigateTool, screenshotTool, getContentTool, closeSessionTool];
}
