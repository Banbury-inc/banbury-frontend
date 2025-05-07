import axios from 'axios';
import { makeFilePrivate } from '../makeFilePrivate';
import { CONFIG } from '../../config';
import type { Mocked } from 'jest-mock';

// Mock axios
jest.mock('axios');
const mockedAxios: Mocked<typeof axios> = axios as any;

describe('makeFilePrivate', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should successfully make a file private', async () => {
        // Arrange
        const mockResponse = {
            data: {
                status: 'success',
                message: 'File made private successfully'
            }
        };
        mockedAxios.post.mockResolvedValue(mockResponse);

        // Act
        const result = await makeFilePrivate('test.txt', 'testDevice');

        // Assert
        expect(mockedAxios.post).toHaveBeenCalledWith(
            `${CONFIG.url}/files/make_file_private/`,
            {
                file_name: 'test.txt',
                username: 'testUser',
                device_name: 'testDevice'
            }
        );
        expect(result).toEqual(mockResponse);
    });

    it('should handle failure response', async () => {
        // Arrange
        const mockResponse = {
            data: {
                status: 'fail',
                message: 'Failed to make file private'
            }
        };
        mockedAxios.post.mockResolvedValue(mockResponse);

        // Act
        const result = await makeFilePrivate('test.txt', 'testDevice');

        // Assert
        expect(result).toBe('make_file_private failed');
    });

    it('should handle unknown status response', async () => {
        // Arrange
        const mockResponse = {
            data: {
                status: 'unknown',
                message: 'Unknown status'
            }
        };
        mockedAxios.post.mockResolvedValue(mockResponse);

        // Act
        const result = await makeFilePrivate('test.txt', 'testDevice');

        // Assert
        expect(result).toBe('make_file_private failed');
    });

    it('should handle network errors', async () => {
        // Arrange
        mockedAxios.post.mockRejectedValue(new Error('Network error'));

        // Act
        const result = await makeFilePrivate('test.txt', 'testDevice');

        // Assert
        expect(result).toBe('error');
        expect(console.error).toHaveBeenCalled(); // Note: You might need to mock console.error
    });

    it('should handle null username', async () => {
        // Arrange
        const mockResponse = {
            data: {
                status: 'success',
                message: 'File made private successfully'
            }
        };
        mockedAxios.post.mockResolvedValue(mockResponse);

        // Act
        const result = await makeFilePrivate('test.txt', 'testDevice');

        // Assert
        expect(mockedAxios.post).toHaveBeenCalledWith(
            `${CONFIG.url}/files/make_file_private/`,
            {
                file_name: 'test.txt',
                username: null,
                device_name: 'testDevice'
            }
        );
        expect(result).toEqual(mockResponse);
    });
}); 
