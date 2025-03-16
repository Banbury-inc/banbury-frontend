import { Ollama } from 'ollama';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    images?: string[]; // Base64 encoded images
}

export interface ChatOptions {
    model?: string;
    temperature?: number;
    stream?: boolean;
}

export class OllamaClient {
    private client: Ollama;
    private defaultModel: string;

    constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'llava') {
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

        // Convert messages to the format expected by Ollama
        const formattedMessages = messages.map(msg => {
            const formattedMessage: any = {
                role: msg.role,
                content: msg.content
            };

            // If the message has images and it's from the user, include them
            if (msg.images && msg.images.length > 0 && msg.role === 'user') {
                formattedMessage.images = msg.images;
            }

            return formattedMessage;
        });

        if (stream) {
            return await this.client.chat({
                model,
                messages: formattedMessages,
                stream: true,
                options: {
                    temperature
                }
            });
        } else {
            const response = await this.client.chat({
                model,
                messages: formattedMessages,
                options: {
                    temperature
                }
            });
            return response;
        }
    }

    /**
     * List available models
     */
    async listModels() {
            const models = await this.client.list();
            return models;
    }

    /**
     * Generate a completion for a prompt
     */
    async generate(prompt: string, options: ChatOptions = {}) {
        const { model = this.defaultModel, temperature = 0.7, stream = false } = options;

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
    }
}
