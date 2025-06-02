import { loadGlobalAxiosCredentials } from '../middleware/axiosGlobalHeader';

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
export class CloudMcpClient {
  private config: McpServerConfig;
  private token?: string;
  private username?: string;

  constructor(config: McpServerConfig) {
    this.config = config;
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
   * Get list of available tools
   */
  public getAvailableTools(): string[] {
    return [
      'add',
      'get-joke',
      'banbury-login',
      'banbury-get-device-info',
      'banbury-update-device',
      'banbury-declare-online',
    //   'banbury-get-files',
      'banbury-get-scanned-folders',
      'banbury-get-sessions',
      'banbury-add-task',
    //   'banbury-add-model'
    ];
  }

  /**
   * Get scanned folders for a device
   */
  public async getScannedFolders(deviceName?: string): Promise<McpToolResult> {
    return this.callTool({
      tool: 'banbury-get-scanned-folders',
      parameters: {
        ...(deviceName && { device_name: deviceName }),
        environment: 'dev'
      }
    });
  }

  /**
   * Add a task to Banbury
   */
  public async addTask(description: string, deviceName?: string): Promise<McpToolResult> {
    return this.callTool({
      tool: 'banbury-add-task',
      parameters: {
        task_description: description,
        ...(deviceName && { device_name: deviceName }),
        environment: 'dev'
      }
    });
  }

  /**
   * Get device information
   */
  public async getDeviceInfo(deviceName: string): Promise<McpToolResult> {
    return this.callTool({
      tool: 'banbury-get-device-info',
      parameters: {
        device_name: deviceName,
        environment: 'dev'
      }
    });
  }

  /**
   * Get current sessions
   */
  public async getSessions(): Promise<McpToolResult> {
    return this.callTool({
      tool: 'banbury-get-sessions',
      parameters: { environment: 'dev' }
    });
  }

  /**
   * Login to Banbury (for initial authentication)
   */
  public async login(username: string, password: string): Promise<McpToolResult> {
    return this.callTool({
      tool: 'banbury-login',
      parameters: { username, password, environment: 'dev' }
    });
  }
} 