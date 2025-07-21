import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { WebSearchService } from '../../basic/tools/webSearch';

/**
 * Create Web Search tools using proper LangChain tool definitions with Zod schemas
 */
export function createWebSearchTools(webSearchService: WebSearchService, webSearchEnabled: boolean) {
  if (!webSearchEnabled) {
    return [];
  }

  const webSearchTool = tool(
    async ({ query, maxResults = 5 }) => {
      try {
        if (!query || query.trim().length === 0) {
          return 'Error: Search query is required';
        }

        const searchResults = await webSearchService.search(query, maxResults);
        
        if (searchResults.length === 0) {
          return `No web search results found for query: "${query}"`;
        }

        const resultText = searchResults.map((result, index) => 
          `**${index + 1}. ${result.title}**\n${result.snippet}\nSource: ${result.link}`
        ).join('\n\n');

        return `Web search results for "${query}":\n\n${resultText}`;
      } catch (error) {
        return `Error performing web search: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "web_search_tool",
      description: "Search the web for current information, news, facts, or any query that requires up-to-date information",
      schema: z.object({
        query: z.string().describe("Search query string"),
        maxResults: z.number().optional().default(5).describe("Maximum number of results to return (default: 5)"),
      }),
    }
  );

  return [webSearchTool];
} 