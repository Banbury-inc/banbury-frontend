import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { BanburyMcpClient } from '../../basic/tools/banburyMCP/BanburyMcpClient';

/**
 * Create Banbury tools using proper LangChain tool definitions with Zod schemas
 */
export function createBanburyTools(mcpClient: BanburyMcpClient | null) {
  const deviceInfoTool = tool(
    async ({ device_name }) => {
      if (!mcpClient) {
        return 'MCP client not available';
      }
      try {
        const result = await mcpClient.callTool({
          tool: 'banbury-get-device-info',
          parameters: { device_name }
        });
        return result.content.map(c => c.text).join('\n');
      } catch (error) {
        return `Error: ${error}`;
      }
    },
    {
      name: "banbury-get-device-info",
      description: "Get comprehensive device information and status including performance metrics",
      schema: z.object({
        device_name: z.string().optional().describe("Device name to query (optional)"),
      }),
    }
  );

  const sessionsTool = tool(
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
    },
    {
      name: "banbury-get-sessions",
      description: "Get current active sessions and task information from the system",
      schema: z.object({}),
    }
  );

  const scannedFoldersTool = tool(
    async ({ device_name }) => {
      if (!mcpClient) {
        return 'MCP client not available';
      }
      try {
        const result = await mcpClient.callTool({
          tool: 'banbury-get-scanned-folders',
          parameters: { device_name }
        });
        return result.content.map(c => c.text).join('\n');
      } catch (error) {
        return `Error: ${error}`;
      }
    },
    {
      name: "banbury-get-scanned-folders",
      description: "List all monitored directory locations on the device",
      schema: z.object({
        device_name: z.string().optional().describe("Device name to query (optional)"),
      }),
    }
  );

  const randomFilesTool = tool(
    async ({ count, device_name }) => {
      if (!mcpClient) {
        return 'MCP client not available';
      }
      try {
        const result = await mcpClient.callTool({
          tool: 'banbury-get-random-files',
          parameters: { count, device_name }
        });
        return result.content.map(c => c.text).join('\n');
      } catch (error) {
        return `Error: ${error}`;
      }
    },
    {
      name: "banbury-get-random-files",
      description: "Get a random sample of files from the monitored system",
      schema: z.object({
        count: z.number().default(10).describe("Number of random files to retrieve"),
        device_name: z.string().optional().describe("Device name to query (optional)"),
      }),
    }
  );

  const addTaskTool = tool(
    async ({ task_description, device_name }) => {
      if (!mcpClient) {
        return 'MCP client not available';
      }
      try {
        const result = await mcpClient.callTool({
          tool: 'banbury-add-task',
          parameters: { task_description, device_name }
        });
        return result.content.map(c => c.text).join('\n');
      } catch (error) {
        return `Error: ${error}`;
      }
    },
    {
      name: "banbury-add-task",
      description: "Create a new task in the system queue",
      schema: z.object({
        task_description: z.string().describe("Description of the task to add"),
        device_name: z.string().optional().describe("Device name to assign task to (optional)"),
      }),
    }
  );

  return [deviceInfoTool, sessionsTool, scannedFoldersTool, randomFilesTool, addTaskTool];
}
