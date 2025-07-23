import { createSimpleTool, convertToLangChainTool, createToolParameter } from './simplifiedTools';
import { WebSearchService } from '../../basic/tools/webSearch';

/**
 * Create Web Search tools using simplified tool definitions
 */
export function createWebSearchTools(webSearchService: WebSearchService): any[] {
  
  const webSearchTool = createSimpleTool(
    'web_search',
    'Search the web for information using a search query',
    {
      query: createToolParameter('string', 'Search query to find information on the web', { required: true }),
      maxResults: createToolParameter('number', 'Maximum number of search results to return (default: 5)', { default: 5, optional: true })
    },
    async (params: { query: string; maxResults?: number }) => {
      try {
        const results = await webSearchService.search(params.query, params.maxResults || 5);
        
        if (!results.length) {
          return `No search results found for: ${params.query}`;
        }
        
        const formattedResults = results.map((result, index) => {
          return `${index + 1}. **${result.title}**\n   URL: ${result.link}\n   ${result.snippet}\n`;
        }).join('\n');
        
        return `Web search results for "${params.query}":\n\n${formattedResults}`;
      } catch (error) {
        return `Error performing web search: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  return [convertToLangChainTool(webSearchTool)];
} 