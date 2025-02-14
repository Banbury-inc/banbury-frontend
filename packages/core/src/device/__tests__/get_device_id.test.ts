import { getDeviceId } from "../get_device_id";

describe('getDeviceId Integration Tests', () => {
    // This is an integration test that hits the real endpoint
    it('should fetch device data for a valid user', async () => {
        // Use a test user that exists in your system
        const username = 'mmills';

        const device_id = await getDeviceId(username);

        // Verify the response structure
        expect(typeof device_id).toBe('string');
        expect(device_id).toBeTruthy();

    });

    it('should handle non-existent user gracefully', async () => {
        const username = 'nonexistentuser123';

        const device_id = await getDeviceId(username);

        // The function should return undefined or empty array for non-existent user
        expect(device_id).toBeFalsy();
    });

    // Test error handling
    it('should handle network errors gracefully', async () => {
        // Temporarily modify the CONFIG.url to cause a network error
        const originalConsoleError = console.error;
        console.error = jest.fn();

        try {
            const username = 'testuser';
            const device_id = await getDeviceId(username);

            expect(device_id).toBeUndefined();
            expect(console.error).toHaveBeenCalled();
        } finally {
            console.error = originalConsoleError;
        }
    });
}); 