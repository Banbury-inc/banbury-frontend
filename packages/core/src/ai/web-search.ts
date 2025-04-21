import axios from 'axios';
import * as cheerio from 'cheerio';

export interface WebSearchResult {
    title: string;
    link: string;
    snippet: string;
}

export class WebSearchService {
    private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

    async search(query: string, maxResults: number = 5): Promise<WebSearchResult[]> {
        try {
            // Try different search engines in sequence until we get results
            const results = await this.searchDuckDuckGo(query, maxResults);
            if (results.length > 0) return results;

            return await this.searchBrave(query, maxResults);
        } catch (error) {
            console.error('Web search error:', error);
            return [{
                title: 'Search Error',
                link: '',
                snippet: 'Unable to perform web search at this time. Please try again later.'
            }];
        }
    }

    private async searchDuckDuckGo(query: string, maxResults: number): Promise<WebSearchResult[]> {
        try {
            const encodedQuery = encodeURIComponent(query);
            const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            const $ = cheerio.load(response.data);
            const results: WebSearchResult[] = [];

            $('.result').each(function(this: any, i: number) {
                if (i >= maxResults) return false;

                const title = $(this).find('.result__title').text().trim();
                const link = $(this).find('.result__url').text().trim();
                const snippet = $(this).find('.result__snippet').text().trim();

                if (title && (link || snippet)) {
                    results.push({
                        title,
                        link: link || '',
                        snippet: snippet || title
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('DuckDuckGo search error:', error);
            return [];
        }
    }

    private async searchBrave(query: string, maxResults: number): Promise<WebSearchResult[]> {
        try {
            const encodedQuery = encodeURIComponent(query);
            const response = await axios.get(`https://search.brave.com/search?q=${encodedQuery}&source=web`, {
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            const $ = cheerio.load(response.data);
            const results: WebSearchResult[] = [];

            $('.snippet').each(function(this: any, i: number) {
                if (i >= maxResults) return false;

                const title = $(this).find('.title').text().trim();
                const link = $(this).find('.url').text().trim();
                const snippet = $(this).find('.description').text().trim();

                if (title && (link || snippet)) {
                    results.push({
                        title,
                        link: link || '',
                        snippet: snippet || title
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('Brave search error:', error);
            return [];
        }
    }
} 