import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

/**
 * Create File System tools using proper LangChain tool definitions with Zod schemas
 * Following the same pattern as Python's FileManagementToolkit
 */
export function createFileSystemTools(fileSystemRootDir: string) {
  // Helper function to resolve and validate paths
  const resolvePath = (inputPath: string): string => {
    // Resolve relative paths against the root directory
    const resolvedPath = path.isAbsolute(inputPath) 
      ? inputPath 
      : path.resolve(fileSystemRootDir, inputPath);
    
    // Ensure the path is within the allowed root directory
    if (!resolvedPath.startsWith(fileSystemRootDir)) {
      throw new Error(`Access denied: Path must be within ${fileSystemRootDir}`);
    }
    
    return resolvedPath;
  };

  const readFileTool = tool(
    async ({ file_path }) => {
      try {
        const resolvedPath = resolvePath(file_path);
        const content = fs.readFileSync(resolvedPath, 'utf-8');
        return `File contents of ${file_path}:\n\n${content}`;
      } catch (error) {
        return `Error reading file ${file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "file_read_tool",
      description: "Read the contents of a file",
      schema: z.object({
        file_path: z.string().describe("Path to the file to read"),
      }),
    }
  );

  const writeFileTool = tool(
    async ({ file_path, text }) => {
      try {
        const resolvedPath = resolvePath(file_path);
        // Ensure the directory exists
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        fs.writeFileSync(resolvedPath, text, 'utf-8');
        return `File written successfully to ${file_path}`;
      } catch (error) {
        return `Error writing file ${file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "file_write_tool",
      description: "Write text content to a file",
      schema: z.object({
        file_path: z.string().describe("Path to the file to write"),
        text: z.string().describe("Text content to write to the file"),
      }),
    }
  );

  const listDirectoryTool = tool(
    async ({ directory_path = "." }) => {
      try {
        const resolvedPath = resolvePath(directory_path);
        const items = fs.readdirSync(resolvedPath, { withFileTypes: true });
        
        const result = items.map(item => {
          return `${item.isDirectory() ? 'DIR' : 'FILE'}: ${item.name}`;
        });
        
        return `Contents of ${directory_path}:\n${result.join('\n')}`;
      } catch (error) {
        return `Error listing directory ${directory_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "file_list_directory_tool",
      description: "List files and directories in a specified path",
      schema: z.object({
        directory_path: z.string().optional().default(".").describe("Path to the directory to list (default: current directory)"),
      }),
    }
  );

  const copyFileTool = tool(
    async ({ source_path, destination_path }) => {
      try {
        const resolvedSource = resolvePath(source_path);
        const resolvedDest = resolvePath(destination_path);
        
        // Ensure destination directory exists
        fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });
        fs.copyFileSync(resolvedSource, resolvedDest);
        
        return `File copied successfully from ${source_path} to ${destination_path}`;
      } catch (error) {
        return `Error copying file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "file_copy_tool",
      description: "Copy a file from source to destination",
      schema: z.object({
        source_path: z.string().describe("Path to the source file"),
        destination_path: z.string().describe("Path to the destination file"),
      }),
    }
  );

  const moveFileTool = tool(
    async ({ source_path, destination_path }) => {
      try {
        const resolvedSource = resolvePath(source_path);
        const resolvedDest = resolvePath(destination_path);
        
        // Ensure destination directory exists
        fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });
        fs.renameSync(resolvedSource, resolvedDest);
        
        return `File moved successfully from ${source_path} to ${destination_path}`;
      } catch (error) {
        return `Error moving file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "file_move_tool",
      description: "Move or rename a file from source to destination",
      schema: z.object({
        source_path: z.string().describe("Path to the source file"),
        destination_path: z.string().describe("Path to the destination file"),
      }),
    }
  );

  const deleteFileTool = tool(
    async ({ file_path }) => {
      try {
        const resolvedPath = resolvePath(file_path);
        const stats = fs.statSync(resolvedPath);
        
        if (stats.isDirectory()) {
          fs.rmSync(resolvedPath, { recursive: true, force: true });
          return `Directory ${file_path} deleted successfully`;
        } else {
          fs.unlinkSync(resolvedPath);
          return `File ${file_path} deleted successfully`;
        }
      } catch (error) {
        return `Error deleting ${file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "file_delete_tool",
      description: "Delete a file or directory",
      schema: z.object({
        file_path: z.string().describe("Path to the file or directory to delete"),
      }),
    }
  );

  const searchFilesTool = tool(
    async ({ directory_path = ".", pattern, file_extension }) => {
      try {
        const resolvedPath = resolvePath(directory_path);
        const results: string[] = [];
        
        const searchRecursive = (currentPath: string) => {
          const items = fs.readdirSync(currentPath, { withFileTypes: true });
          
          for (const item of items) {
            const itemFullPath = path.join(currentPath, item.name);
            const relativePath = path.relative(fileSystemRootDir, itemFullPath);
            
            if (item.isDirectory()) {
              try {
                searchRecursive(itemFullPath);
              } catch (error) {
                console.error(`Error reading directory ${itemFullPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            } else {
              let matches = true;
              
              if (pattern && !item.name.toLowerCase().includes(pattern.toLowerCase())) {
                matches = false;
              }
              
              if (file_extension && !item.name.toLowerCase().endsWith(file_extension.toLowerCase())) {
                matches = false;
              }
              
              if (matches) {
                results.push(relativePath);
              }
            }
          }
        };
        
        searchRecursive(resolvedPath);
        
        if (results.length === 0) {
          return `No files found matching the criteria in ${directory_path}`;
        }
        
        return `Found ${results.length} files:\n${results.join('\n')}`;
      } catch (error) {
        return `Error searching files: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "file_search_tool",
      description: "Search for files in a directory by name pattern or extension",
      schema: z.object({
        directory_path: z.string().optional().default(".").describe("Directory to search in"),
        pattern: z.string().optional().describe("Text pattern to search for in filenames"),
        file_extension: z.string().optional().describe("File extension to filter by (e.g., '.txt', '.js')"),
      }),
    }
  );

  return [
    readFileTool,
    writeFileTool,
    listDirectoryTool,
    copyFileTool,
    moveFileTool,
    deleteFileTool,
    searchFilesTool
  ];
}
