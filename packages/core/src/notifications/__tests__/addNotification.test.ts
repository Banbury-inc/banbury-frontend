import axios from 'axios';
import { addNotification } from '../addNotification';
import MockAdapter from 'axios-mock-adapter';
import { CONFIG } from '../../config';

// Mock token loader to always return a dummy token
jest.mock('../../middleware/axiosGlobalHeader', () => ({
  loadGlobalAxiosAuthToken: () => ({ token: 'dummy-token' }),
}));

describe('addNotification', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(axios);
    });

    afterEach(() => {
        mock.reset();
    });

    const friendUsername = 'friendUser';
    const testNotification = {
        type: 'info',
        title: 'Test Notification',
        description: 'This is a test notification',
        timestamp: new Date(),
        read: false,
    };
    const baseUrl = `${CONFIG.url}/notifications/add_notification/${friendUsername}/`;

    it('should return success when notification is added successfully', async () => {
        mock.onPost(baseUrl).reply(200, { result: 'success', username: friendUsername });

        const result = await addNotification(friendUsername, testNotification);
        expect(result).toBe('success');
    });

    it('should return failed when notification addition fails', async () => {
        mock.onPost(baseUrl).reply(200, { result: 'fail', username: friendUsername });

        const result = await addNotification(friendUsername, testNotification);
        expect(result).toBe('failed');
    });

    it('should return exists when notification already exists', async () => {
        mock.onPost(baseUrl).reply(200, { result: 'task_already_exists', username: friendUsername });

        const result = await addNotification(friendUsername, testNotification);
        expect(result).toBe('exists');
    });

    it('should return task_add failed for unknown response', async () => {
        mock.onPost(baseUrl).reply(200, { result: 'unknown', username: friendUsername });

        const result = await addNotification(friendUsername, testNotification);
        expect(result).toBe('task_add failed');
    });

    it('should handle network errors', async () => {
        mock.onPost(baseUrl).networkError();

        await expect(addNotification(friendUsername, testNotification)).rejects.toThrow();
    });

}); 
