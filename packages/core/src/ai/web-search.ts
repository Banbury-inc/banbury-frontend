import axios from 'axios';

export interface WebSearchResult {
    title: string;
    link: string;
    snippet: string;
}

export class WebSearchService {
    private readonly baseUrl = 'https://api.duckduckgo.com/';

    async search(query: string, maxResults: number = 5): Promise<WebSearchResult[]> {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    q: query,
                    format: 'json',
                    no_html: 1,
                    skip_disambig: 1,
                    no_redirect: 1
                }
            });

            const results: WebSearchResult[] = [];
            
            // Add instant answer if available
            if (response.data.Abstract) {
                results.push({
                    title: response.data.Abstract,
                    link: response.data.AbstractURL,
                    snippet: response.data.Abstract
                });
            }

            // Add related topics
            if (response.data.RelatedTopics) {
                for (const topic of response.data.RelatedTopics) {
                    if (results.length >= maxResults) break;
                    
                    if (topic.Text && topic.FirstURL) {
                        results.push({
                            title: topic.Text.split(' - ')[0],
                            link: topic.FirstURL,
                            snippet: topic.Text
                        });
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('Web search error:', error);
            return [];
        }
    }
} 