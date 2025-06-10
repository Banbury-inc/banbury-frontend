import { loadGlobalAxiosCredentials } from '../../../../middleware/axiosGlobalHeader';
import banbury from '../../../..';


export interface McpToolCall {
  tool: string;
  parameters: Record<string, any>;
}

export interface McpToolResult {
  success: boolean;
  content: Array<{ type: string; text: string }>;
  error?: string;
}

export interface McpServerConfig {
  baseUrl: string;
  apiKey?: string;
}

/**
 * Cloud MCP Client for communicating with the Banbury MCP Server
 */
export class BanburyMcpClient {
  private config: McpServerConfig;
  private token?: string;
  private username?: string;

  constructor(serverConfig?: McpServerConfig) {
    this.config = {
      baseUrl: banbury.config.url_mcp,
      ...serverConfig
    };
    this.loadCredentials();
  }

  /**
   * Load credentials from the frontend's credential system
   */
  private loadCredentials() {
    const credentials = loadGlobalAxiosCredentials();
    this.token = credentials.token;
    this.username = credentials.username;
  }

  /**
   * Refresh credentials if needed
   */
  public refreshCredentials() {
    this.loadCredentials();
  }

  /**
   * Check if the client is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Make an authenticated request to the cloud MCP server
   */
  private async makeRequest(endpoint: string, body: any): Promise<any> {
    if (!this.token) {
      throw new Error('No authentication token available. Please log in first.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Banbury authentication token using standard Authorization header with Bearer prefix
    // This follows the same pattern as axiosGlobalHeader.ts
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Add MCP server API key if configured (separate from user auth)
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    // Add username for additional context
    if (this.username) {
      headers['X-Username'] = this.username;
    }

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MCP Server Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Call a specific MCP tool
   */
  public async callTool(toolCall: McpToolCall): Promise<McpToolResult> {
    try {
      // For Banbury tools that require authentication, include the token in parameters
      const parameters = { ...toolCall.parameters };
      
      if (toolCall.tool.startsWith('banbury-') && this.token) {
        parameters.token = this.token;
      }

      const response = await this.makeRequest('/tool', {
        tool: toolCall.tool,
        parameters
      });

      return {
        success: true,
        content: response.content || [{ type: 'text', text: JSON.stringify(response) }]
      };
    } catch (error) {
      return {
        success: false,
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch list of available tools from the MCP server
   */
  public async fetchAvailableTools(): Promise<any[]> {
    if (!this.token) {
      throw new Error('No authentication token available. Please log in first.');
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }
    if (this.username) {
      headers['X-Username'] = this.username;
    }
    // Try /tools endpoint
    const endpoints = [`${this.config.baseUrl}/tools`];
    let lastError: any = null;
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });
        if (response.ok) {
          const data = await response.json();
          return data.tools || [];
        } else {
          const errorText = await response.text();
          console.error(`CloudMcpClient: HTTP error from ${url}:`, errorText);
          throw new Error(`MCP Server Error: ${response.status} ${response.statusText} - ${errorText}`);
        }
      } catch (error) {
        console.error(`CloudMcpClient: Error from ${url}:`, error);
        lastError = error;
        // If this is a network error (fetch failed), provide more context
        if (error instanceof TypeError && error.message.includes('fetch')) {
          lastError = new Error(`Network error when trying ${url}: ${error.message}. Check if the server is running and accessible.`);
        }
      }
    }
    const finalError = `Failed to fetch available tools from any endpoint. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`;
    console.error('CloudMcpClient:', finalError);
    throw new Error(finalError);
  }

  /**
   * Safely fetch available tools with graceful fallback
   */
  public async fetchAvailableToolsSafely(): Promise<{ tools: any[], error?: string }> {
    try {
      const tools = await this.fetchAvailableTools();
      return { tools };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('CloudMcpClient: Tools unavailable, continuing without MCP tools:', errorMessage);
      return { 
        tools: [], 
        error: errorMessage 
      };
    }
  }
} 
