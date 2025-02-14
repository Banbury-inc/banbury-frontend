import { fetchDeviceData } from '../fetchDeviceData';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { CONFIG } from '../../config';

describe('fetchDeviceData', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(axios);
    });

    afterEach(() => {
        mock.reset();
    });

    it('should fetch device data successfully', async () => {
        const mockDevices = [{
            _id: '123',
            name: 'Test Device',
            status: 'online'
        }];

        mock.onGet(`${CONFIG.url}/device/get_devices/testuser/`).reply(200, mockDevices);

        const devices = await fetchDeviceData('testuser');
        expect(Array.isArray(devices)).toBe(true);
        expect(devices).toHaveLength(1);
        expect(devices[0]._id).toBe('123');
    });

    it('should handle empty response', async () => {
        mock.onGet(`${CONFIG.url}/device/get_devices/testuser/`).reply(200, []);

        const devices = await fetchDeviceData('testuser');
        expect(Array.isArray(devices)).toBe(true);
        expect(devices).toHaveLength(0);
    });

    it('should handle error response', async () => {
        mock.onGet(`${CONFIG.url}/device/get_devices/testuser/`).reply(500);

        const devices = await fetchDeviceData('testuser');
        expect(devices).toEqual([]);
    });
}); 