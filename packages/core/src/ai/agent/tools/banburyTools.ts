import { BanburyMcpClient } from '../../basic/tools/banburyMCP/BanburyMcpClient';
import { createSimpleTool, convertToLangChainTool, createToolParameter } from './simplifiedTools';

/**
 * Create Banbury tools using simplified tool definitions
 * This avoids complex LangChain generic types while maintaining functionality
 */
export function createBanburyTools(mcpClient: BanburyMcpClient | null): any[] {
  
  // Device Info Tool
  const deviceInfoTool = createSimpleTool(
    'banbury-get-device-info',
    'Get comprehensive device information and status including performance metrics',
    {
      device_name: createToolParameter('string', 'Device name to query (optional)', { optional: true })
    },
    async (params: { device_name?: string }) => {
      if (!mcpClient) {
        return 'MCP client not available';
      }
      try {
        const result = await mcpClient.callTool({
          tool: 'banbury-get-device-info',
          parameters: { device_name: params.device_name }
        });
        return result.content.map(c => c.text).join('\n');
      } catch (error) {
        return `Error: ${error}`;
      }
    }
  );

  // Sessions Tool
  const sessionsTool = createSimpleTool(
    'banbury-get-sessions',
    'Get current active sessions and task information from the system',
    {},
    async () => {
      if (!mcpClient) {
        return 'MCP client not available';
      }
      try {
        const result = await mcpClient.callTool({
          tool: 'banbury-get-sessions',
          parameters: {}
        });
        return result.content.map(c => c.text).join('\n');
      } catch (error) {
        return `Error: ${error}`;
      }
    }
  );

  // Scanned Folders Tool
  const scannedFoldersTool = createSimpleTool(
    'banbury-get-scanned-folders',
    'Get list of folders that have been scanned on the specified device',
    {
      device_name: createToolParameter('string', 'Device name to query (optional)', { optional: true })
    },
    async (params: { device_name?: string }) => {
      if (!mcpClient) {
        return 'MCP client not available';
      }
      try {
        const result = await mcpClient.callTool({
          tool: 'banbury-get-scanned-folders',
          parameters: { device_name: params.device_name }
        });
        return result.content.map(c => c.text).join('\n');
      } catch (error) {
        return `Error: ${error}`;
      }
    }
  );

  // Random Files Tool
  const randomFilesTool = createSimpleTool(
    'banbury-get-random-files',
    'Get a random selection of files from the specified device',
    {
      count: createToolParameter('number', 'Number of random files to retrieve', { default: 10, optional: true }),
      device_name: createToolParameter('string', 'Device name to query (optional)', { optional: true })
    },
    async (params: { count?: number; device_name?: string }) => {
      if (!mcpClient) {
        return 'MCP client not available';
      }
      try {
        const result = await mcpClient.callTool({
          tool: 'banbury-get-random-files',
          parameters: { count: params.count, device_name: params.device_name }
        });
        return result.content.map(c => c.text).join('\n');
      } catch (error) {
        return `Error: ${error}`;
      }
    }
  );

  // Add Task Tool
  const addTaskTool = createSimpleTool(
    'banbury-add-task',
    'Add a new task to the system for the specified device',
    {
      task_description: createToolParameter('string', 'Description of the task to add', { required: true }),
      device_name: createToolParameter('string', 'Device name to assign task to (optional)', { optional: true })
    },
    async (params: { task_description: string; device_name?: string }) => {
      if (!mcpClient) {
        return 'MCP client not available';
      }
      try {
        const result = await mcpClient.callTool({
          tool: 'banbury-add-task',
          parameters: { task_description: params.task_description, device_name: params.device_name }
        });
        return result.content.map(c => c.text).join('\n');
      } catch (error) {
        return `Error: ${error}`;
      }
    }
  );

  // Convert simplified tools to LangChain-compatible format
  return [
    convertToLangChainTool(deviceInfoTool),
    convertToLangChainTool(sessionsTool),
    convertToLangChainTool(scannedFoldersTool),
    convertToLangChainTool(randomFilesTool),
    convertToLangChainTool(addTaskTool)
  ];
}
