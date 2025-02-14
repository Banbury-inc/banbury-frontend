import { Ollama } from 'ollama';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatOptions {
    model?: string;
    temperature?: number;
    stream?: boolean;
}

export class OllamaClient {
    private client: Ollama;
    private defaultModel: string;

    constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'llama2') {
        this.client = new Ollama({
            host: baseUrl
        });
        this.defaultModel = defaultModel;
    }

    /**
     * Send a chat message and get a response
     */
    async chat(messages: ChatMessage[], options: ChatOptions = {}) {
        const { model = this.defaultModel, temperature = 0.7, stream = false } = options;

        try {
            if (stream) {
                return await this.client.chat({
                    model,
                    messages: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    stream: true,
                    options: {
                        temperature
                    }
                });
            } else {
                const response = await this.client.chat({
                    model,
                    messages: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    options: {
                        temperature
                    }
                });
                return response;
            }
        } catch (error) {
            console.error('Error in Ollama chat:', error);
            throw error;
        }
    }

    /**
     * List available models
     */
    async listModels() {
        try {
            const models = await this.client.list();
            return models;
        } catch (error) {
            console.error('Error listing models:', error);
            throw error;
        }
    }

    /**
     * Generate a completion for a prompt
     */
    async generate(prompt: string, options: ChatOptions = {}) {
        const { model = this.defaultModel, temperature = 0.7, stream = false } = options;

        try {
            if (stream) {
                return await this.client.generate({
                    model,
                    prompt,
                    stream: true,
                    options: {
                        temperature
                    }
                });
            } else {
                const response = await this.client.generate({
                    model,
                    prompt,
                    options: {
                        temperature
                    }
                });
                return response;
            }
        } catch (error) {
            console.error('Error in Ollama generate:', error);
            throw error;
        }
    }
}
