import { useState, useEffect, useCallback } from 'react';
import { CloudMcpClient, McpToolCall, McpToolResult, McpServerConfig } from '@banbury/core/src/mcp/CloudMcpClient';
import { loadGlobalAxiosCredentials } from '@banbury/core/src/middleware/axiosGlobalHeader';

interface UseMcpClientOptions {
  serverUrl?: string;
  apiKey?: string;
  autoConnect?: boolean;
}

interface McpClientState {
  client: CloudMcpClient | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  availableTools: string[];
}

export function useMcpClient(options: UseMcpClientOptions = {}) {
  const [state, setState] = useState<McpClientState>({
    client: null,
    isConnected: false,
    isAuthenticated: false,
    error: null,
    availableTools: []
  });

  const serverUrl = options.serverUrl || process.env.REACT_APP_MCP_SERVER_URL || 'http://localhost:3001';
  const apiKey = options.apiKey || process.env.REACT_APP_MCP_API_KEY;

  // Initialize MCP client
  const initializeClient = useCallback(() => {
    try {
      const config: McpServerConfig = {
        baseUrl: serverUrl,
        ...(apiKey && { apiKey })
      };

      const client = new CloudMcpClient(config);
      const isAuth = client.isAuthenticated();
      
      setState(prev => ({
        ...prev,
        client,
        isConnected: true,
        isAuthenticated: isAuth,
        availableTools: client.getAvailableTools(),
        error: null
      }));

      return client;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize MCP client',
        isConnected: false
      }));
      return null;
    }
  }, [serverUrl, apiKey]);

  // Refresh authentication status
  const refreshAuth = useCallback(() => {
    if (state.client) {
      state.client.refreshCredentials();
      const isAuth = state.client.isAuthenticated();
      setState(prev => ({
        ...prev,
        isAuthenticated: isAuth
      }));
    }
  }, [state.client]);

  // Call a tool
  const callTool = useCallback(async (toolCall: McpToolCall): Promise<McpToolResult> => {
    if (!state.client) {
      return {
        success: false,
        content: [{ type: 'text', text: 'MCP client not initialized' }],
        error: 'Client not initialized'
      };
    }

    if (!state.isAuthenticated && state.client.getAvailableTools().filter(tool => 
      !['add', 'get-joke', 'banbury-login'].includes(tool)
    ).includes(toolCall.tool)) {
      return {
        success: false,
        content: [{ type: 'text', text: 'Authentication required for this tool' }],
        error: 'Authentication required'
      };
    }

    try {
      const result = await state.client.callTool(toolCall);
      return result;
    } catch (error) {
      return {
        success: false,
        content: [{ type: 'text', text: `Tool call failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [state.client, state.isAuthenticated]);


  const addTask = useCallback(async (description: string, deviceName?: string): Promise<McpToolResult> => {
    if (!state.client) {
      return {
        success: false,
        content: [{ type: 'text', text: 'MCP client not initialized' }],
        error: 'Client not initialized'
      };
    }
    return state.client.addTask(description, deviceName);
  }, [state.client]);

  const getDeviceInfo = useCallback(async (deviceName: string): Promise<McpToolResult> => {
    if (!state.client) {
      return {
        success: false,
        content: [{ type: 'text', text: 'MCP client not initialized' }],
        error: 'Client not initialized'
      };
    }
    return state.client.getDeviceInfo(deviceName);
  }, [state.client]);

  const getSessions = useCallback(async (): Promise<McpToolResult> => {
    if (!state.client) {
      return {
        success: false,
        content: [{ type: 'text', text: 'MCP client not initialized' }],
        error: 'Client not initialized'
      };
    }
    return state.client.getSessions();
  }, [state.client]);

  // Initialize on mount or when credentials change
  useEffect(() => {
    if (options.autoConnect !== false) {
      initializeClient();
    }
  }, [initializeClient, options.autoConnect]);

  // Watch for credential changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.client) {
        const credentials = loadGlobalAxiosCredentials();
        const wasAuth = state.isAuthenticated;
        const isAuth = !!credentials.token;
        
        if (wasAuth !== isAuth) {
          refreshAuth();
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [state.client, state.isAuthenticated, refreshAuth]);

  return {
    // State
    ...state,
    
    // Actions
    initializeClient,
    refreshAuth,
    callTool,
    
    // Convenience functions
    addTask,
    getDeviceInfo,
    getSessions,
    
    // Tool parsing helpers for AI integration
    parseToolCallFromMessage: (message: string): McpToolCall | null => {
      try {
        // Look for tool calls in various formats
        const patterns = [
          /```mcp-tool\s*([\s\S]*?)```/,
          /\[MCP_TOOL\]([\s\S]*?)\[\/MCP_TOOL\]/,
          /<tool_call>([\s\S]*?)<\/tool_call>/
        ];

        for (const pattern of patterns) {
          const match = message.match(pattern);
          if (match) {
            const toolData = JSON.parse(match[1].trim());
            return {
              tool: toolData.tool || toolData.name,
              parameters: toolData.parameters || toolData.params || {}
            };
          }
        }

        // Look for natural language tool requests
        const naturalPatterns = [
          { pattern: /get (\d+) random files/i, tool: 'banbury-get-files-random', extractor: (m: RegExpMatchArray) => ({ count: parseInt(m[1]) }) },
          { pattern: /add task[:\s]+(.*)/i, tool: 'banbury-add-task', extractor: (m: RegExpMatchArray) => ({ task_description: m[1].trim() }) },
          { pattern: /get device info for (.+)/i, tool: 'banbury-get-device-info', extractor: (m: RegExpMatchArray) => ({ device_name: m[1].trim() }) },
          { pattern: /get sessions/i, tool: 'banbury-get-sessions', extractor: () => ({}) },
          { pattern: /tell me a joke/i, tool: 'get-joke', extractor: () => ({}) }
        ];

        for (const { pattern, tool, extractor } of naturalPatterns) {
          const match = message.match(pattern);
          if (match) {
            return {
              tool,
              parameters: extractor(match)
            };
          }
        }

        return null;
      } catch (error) {
        console.error('Error parsing tool call:', error);
        return null;
      }
    },

    formatToolResult: (result: McpToolResult): string => {
      if (!result.success) {
        return `❌ Tool execution failed: ${result.error || 'Unknown error'}`;
      }

      return result.content.map(item => item.text).join('\n');
    }
  };
} 