import { OllamaClient, ChatMessage } from '../index';
import { Ollama } from 'ollama';

// Mock the entire ollama module
jest.mock('ollama');

describe('OllamaClient', () => {
    let client: OllamaClient;
    const mockOllama = Ollama as jest.MockedClass<typeof Ollama>;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        client = new OllamaClient('http://test-url', 'test-model');
    });

    describe('chat', () => {
        const mockMessages: ChatMessage[] = [
            { role: 'user', content: 'Hello' }
        ];

        it('should handle non-streaming chat requests', async () => {
            const mockResponse = { response: 'Hello there!' };
            mockOllama.prototype.chat.mockResolvedValueOnce(mockResponse as any);

            const response = await client.chat(mockMessages, { stream: false });

            expect(mockOllama.prototype.chat).toHaveBeenCalledWith({
                model: 'test-model',
                messages: mockMessages,
                options: {
                    temperature: 0.7
                }
            });
            expect(response).toEqual(mockResponse);
        });

        it('should handle streaming chat requests', async () => {
            const mockStreamResponse = { response: 'Streaming response' };
            mockOllama.prototype.chat.mockResolvedValueOnce(mockStreamResponse as any);

            const response = await client.chat(mockMessages, { stream: true });

            expect(mockOllama.prototype.chat).toHaveBeenCalledWith({
                model: 'test-model',
                messages: mockMessages,
                stream: true,
                options: {
                    temperature: 0.7
                }
            });
            expect(response).toEqual(mockStreamResponse);
        });

        it('should handle chat errors', async () => {
            const mockError = new Error('Chat error');
            mockOllama.prototype.chat.mockRejectedValueOnce(mockError);

            await expect(client.chat(mockMessages)).rejects.toThrow('Chat error');
        });
    });

    describe('listModels', () => {
        it('should return available models', async () => {
            const mockModels = [{ name: 'model1' }, { name: 'model2' }];
            mockOllama.prototype.list.mockResolvedValueOnce(mockModels as any);

            const models = await client.listModels();

            expect(mockOllama.prototype.list).toHaveBeenCalled();
            expect(models).toEqual(mockModels);
        });

        it('should handle listModels errors', async () => {
            const mockError = new Error('List error');
            mockOllama.prototype.list.mockRejectedValueOnce(mockError);

            await expect(client.listModels()).rejects.toThrow('List error');
        });
    });

    describe('generate', () => {
        const mockPrompt = 'Test prompt';

        it('should handle non-streaming generate requests', async () => {
            const mockResponse = { response: 'Generated text' };
            mockOllama.prototype.generate.mockResolvedValueOnce(mockResponse as any);

            const response = await client.generate(mockPrompt, { stream: false });

            expect(mockOllama.prototype.generate).toHaveBeenCalledWith({
                model: 'test-model',
                prompt: mockPrompt,
                options: {
                    temperature: 0.7
                }
            });
            expect(response).toEqual(mockResponse);
        });

        it('should handle streaming generate requests', async () => {
            const mockStreamResponse = { response: 'Streaming generated text' };
            mockOllama.prototype.generate.mockResolvedValueOnce(mockStreamResponse as any);

            const response = await client.generate(mockPrompt, { stream: true });

            expect(mockOllama.prototype.generate).toHaveBeenCalledWith({
                model: 'test-model',
                prompt: mockPrompt,
                stream: true,
                options: {
                    temperature: 0.7
                }
            });
            expect(response).toEqual(mockStreamResponse);
        });

        it('should handle generate errors', async () => {
            const mockError = new Error('Generate error');
            mockOllama.prototype.generate.mockRejectedValueOnce(mockError);

            await expect(client.generate(mockPrompt)).rejects.toThrow('Generate error');
        });
    });
}); 