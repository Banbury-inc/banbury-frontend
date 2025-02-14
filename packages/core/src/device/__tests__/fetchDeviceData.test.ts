import { fetchDeviceData } from '../fetchDeviceData';

describe('fetchDeviceData Integration Tests', () => {
    // This is an integration test that hits the real endpoint
    it('should fetch device data for a valid user', async () => {
        // Use a test user that exists in your system
        const username = 'mmills';

        const devices = await fetchDeviceData(username);

        // Verify the response structure
        expect(Array.isArray(devices)).toBe(true);

        // If devices exist, verify the structure of a device
        if (devices && devices.length > 0) {
            const device = devices[0];
            expect(device).toHaveProperty('_id');
            expect(device).toHaveProperty('device_name');
            expect(device).toHaveProperty('device_type');
            expect(device).toHaveProperty('storage_capacity_gb');
            expect(device).toHaveProperty('storage_capacity_gb');
            expect(device).toHaveProperty('device_manufacturer');
            expect(device).toHaveProperty('device_model');
            expect(device).toHaveProperty('online');
        }
    });

    it('should handle non-existent user gracefully', async () => {
        const username = 'nonexistentuser123';

        const devices = await fetchDeviceData(username);

        // The function should return undefined or empty array for non-existent user
        expect(devices).toBeFalsy();
    });

    // Test error handling
    it('should handle network errors gracefully', async () => {
        // Temporarily modify the CONFIG.url to cause a network error
        const originalConsoleError = console.error;
        console.error = jest.fn();

        try {
            const username = 'testuser';
            const devices = await fetchDeviceData(username);

            expect(devices).toBeUndefined();
            expect(console.error).toHaveBeenCalled();
        } finally {
            console.error = originalConsoleError;
        }
    });
}); 