import { getDeviceId } from "../get_device_id";
import { fetchDeviceData } from "../fetchDeviceData";

jest.mock('../fetchDeviceData');

describe('getDeviceId', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return device id when device exists', async () => {
        const mockDevices = [{
            _id: 'test-device-id',
            name: 'Test Device'
        }];
        (fetchDeviceData as jest.Mock).mockResolvedValue(mockDevices);

        const deviceId = await getDeviceId('testuser');
        expect(deviceId).toBe('test-device-id');
        expect(fetchDeviceData).toHaveBeenCalledWith('testuser');
    });

    it('should return undefined when no devices exist', async () => {
        (fetchDeviceData as jest.Mock).mockResolvedValue([]);

        const deviceId = await getDeviceId('testuser');
        expect(deviceId).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
        (fetchDeviceData as jest.Mock).mockRejectedValue(new Error('Network error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const deviceId = await getDeviceId('testuser');
        expect(deviceId).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
}); 
