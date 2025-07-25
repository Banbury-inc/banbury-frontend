import { createSimpleTool, convertToLangChainTool, createToolParameter } from './simplifiedTools';
import fs from 'fs';
import path from 'path';

/**
 * Create File System tools using simplified tool definitions
 */
export function createFileSystemTools(fileSystemRootDir: string): any[] {
  
  // Helper function to resolve and validate paths
  const resolvePath = (inputPath: string): string => {
    const resolvedPath = path.isAbsolute(inputPath) 
      ? inputPath 
      : path.resolve(fileSystemRootDir, inputPath);
    
    if (!resolvedPath.startsWith(fileSystemRootDir)) {
      throw new Error(`Access denied: Path must be within ${fileSystemRootDir}`);
    }
    
    return resolvedPath;
  };

  // Read File Tool
  const readFileTool = createSimpleTool(
    'file_read_tool',
    'Read the contents of a file',
    {
      file_path: createToolParameter('string', 'Path to the file to read', { required: true })
    },
    async (params: { file_path: string }) => {
      try {
        const resolvedPath = resolvePath(params.file_path);
        const content = fs.readFileSync(resolvedPath, 'utf-8');
        return `File contents of ${params.file_path}:\n\n${content}`;
      } catch (error) {
        return `Error reading file ${params.file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Write File Tool
  const writeFileTool = createSimpleTool(
    'file_write_tool',
    'Write text content to a file',
    {
      file_path: createToolParameter('string', 'Path to the file to write', { required: true }),
      text: createToolParameter('string', 'Text content to write to the file', { required: true })
    },
    async (params: { file_path: string; text: string }) => {
      try {
        const resolvedPath = resolvePath(params.file_path);
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        fs.writeFileSync(resolvedPath, params.text, 'utf-8');
        return `Successfully wrote to ${params.file_path}`;
      } catch (error) {
        return `Error writing to file ${params.file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // List Directory Tool
  const listDirectoryTool = createSimpleTool(
    'list_directory_tool',
    'List files and directories in a given path',
    {
      directory_path: createToolParameter('string', 'Path to the directory to list', { default: '.', optional: true })
    },
    async (params: { directory_path?: string }) => {
      try {
        const dirPath = params.directory_path || '.';
        const resolvedPath = resolvePath(dirPath);
        const items = fs.readdirSync(resolvedPath, { withFileTypes: true });
        const formattedItems = items.map(item => {
          const type = item.isDirectory() ? 'DIR' : 'FILE';
          const stats = fs.statSync(path.join(resolvedPath, item.name));
          const size = item.isFile() ? stats.size : '';
          const modified = stats.mtime.toISOString().split('T')[0];
          return `${type.padEnd(4)} ${item.name.padEnd(30)} ${size.toString().padStart(10)} ${modified}`;
        });
        
        const header = `${'TYPE'.padEnd(4)} ${'NAME'.padEnd(30)} ${'SIZE'.padStart(10)} ${'MODIFIED'}`;
        return `Directory listing for ${dirPath}:\n\n${header}\n${'-'.repeat(60)}\n${formattedItems.join('\n')}`;
      } catch (error) {
        return `Error listing directory ${params.directory_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Copy File Tool
  const copyFileTool = createSimpleTool(
    'copy_file_tool',
    'Copy a file from source to destination',
    {
      source_path: createToolParameter('string', 'Source file path', { required: true }),
      destination_path: createToolParameter('string', 'Destination file path', { required: true })
    },
    async (params: { source_path: string; destination_path: string }) => {
      try {
        const resolvedSource = resolvePath(params.source_path);
        const resolvedDest = resolvePath(params.destination_path);
        
        fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });
        fs.copyFileSync(resolvedSource, resolvedDest);
        return `Successfully copied ${params.source_path} to ${params.destination_path}`;
      } catch (error) {
        return `Error copying file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Move File Tool
  const moveFileTool = createSimpleTool(
    'move_file_tool',
    'Move/rename a file from source to destination',
    {
      source_path: createToolParameter('string', 'Source file path', { required: true }),
      destination_path: createToolParameter('string', 'Destination file path', { required: true })
    },
    async (params: { source_path: string; destination_path: string }) => {
      try {
        const resolvedSource = resolvePath(params.source_path);
        const resolvedDest = resolvePath(params.destination_path);
        
        fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });
        fs.renameSync(resolvedSource, resolvedDest);
        return `Successfully moved ${params.source_path} to ${params.destination_path}`;
      } catch (error) {
        return `Error moving file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Delete File Tool
  const deleteFileTool = createSimpleTool(
    'delete_file_tool',
    'Delete a file or directory',
    {
      file_path: createToolParameter('string', 'Path to the file or directory to delete', { required: true })
    },
    async (params: { file_path: string }) => {
      try {
        const resolvedPath = resolvePath(params.file_path);
        const stats = fs.statSync(resolvedPath);
        
        if (stats.isDirectory()) {
          fs.rmSync(resolvedPath, { recursive: true, force: true });
          return `Successfully deleted directory ${params.file_path}`;
        } else {
          fs.unlinkSync(resolvedPath);
          return `Successfully deleted file ${params.file_path}`;
        }
      } catch (error) {
        return `Error deleting ${params.file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Search Files Tool
  const searchFilesTool = createSimpleTool(
    'search_files_tool',
    'Search for files in a directory based on name pattern and/or file extension',
    {
      directory_path: createToolParameter('string', 'Directory to search in', { default: '.', optional: true }),
      pattern: createToolParameter('string', 'Pattern to search for in filenames', { optional: true }),
      file_extension: createToolParameter('string', 'File extension to filter by (e.g., \'.txt\', \'.js\')', { optional: true })
    },
    async (params: { directory_path?: string; pattern?: string; file_extension?: string }) => {
      try {
        const dirPath = params.directory_path || '.';
        const resolvedPath = resolvePath(dirPath);
        const results: string[] = [];
        
        const searchRecursive = (currentPath: string) => {
          try {
            const items = fs.readdirSync(currentPath, { withFileTypes: true });
            
            for (const item of items) {
              const fullPath = path.join(currentPath, item.name);
              const relativePath = path.relative(resolvedPath, fullPath);
              
              if (item.isDirectory()) {
                if (!item.name.startsWith('.') && 
                    !['node_modules', 'dist', 'build', 'coverage'].includes(item.name)) {
                  searchRecursive(fullPath);
                }
              } else {
                let matches = true;
                
                if (params.file_extension && !item.name.toLowerCase().endsWith(params.file_extension.toLowerCase())) {
                  matches = false;
                }
                
                if (params.pattern && !item.name.toLowerCase().includes(params.pattern.toLowerCase())) {
                  matches = false;
                }
                
                if (matches) {
                  const stats = fs.statSync(fullPath);
                  const size = stats.size;
                  const modified = stats.mtime.toISOString().split('T')[0];
                  results.push(`${relativePath.padEnd(50)} ${size.toString().padStart(10)} ${modified}`);
                }
              }
            }
          } catch (error) {
            return `Error searching files: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        };
        
        searchRecursive(resolvedPath);
        
        if (results.length === 0) {
          return `No files found matching criteria in ${dirPath}`;
        }
        
        const header = `${'FILE PATH'.padEnd(50)} ${'SIZE'.padStart(10)} ${'MODIFIED'}`;
        return `Search results in ${dirPath}:\n\n${header}\n${'-'.repeat(72)}\n${results.slice(0, 50).join('\n')}${results.length > 50 ? `\n\n... and ${results.length - 50} more files` : ''}`;
      } catch (error) {
        return `Error searching files: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Convert simplified tools to LangChain-compatible format
  return [
    convertToLangChainTool(readFileTool),
    convertToLangChainTool(writeFileTool),
    convertToLangChainTool(listDirectoryTool),
    convertToLangChainTool(copyFileTool),
    convertToLangChainTool(moveFileTool),
    convertToLangChainTool(deleteFileTool),
    convertToLangChainTool(searchFilesTool)
  ];
}
