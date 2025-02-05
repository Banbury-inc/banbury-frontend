import { fetchDeviceData } from '../../../components/pages/Files/utils/fetchDeviceData';
import { fileWatcherEmitter } from '../../device/watchdog';

// Mock the fetchDeviceData function
jest.mock('../../../components/pages/Files/utils/fetchDeviceData');
const mockFetchDeviceData = fetchDeviceData as jest.MockedFunction<typeof fetchDeviceData>;

// Mock React hooks
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: (cb: Function) => cb(),
  useState: (initialValue: any) => [initialValue, jest.fn()],
}));

describe('newUseFileData', () => {
    // Mock functions
    const setFirstname = jest.fn();
    const setLastname = jest.fn();
    const setDevices = jest.fn();
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const defaultProps = {
        username: 'testUser',
        disableFetch: false,
        updates: 0,
        global_file_path: null,
        global_file_path_device: null,
        setFirstname,
        setLastname,
        files: [],
        sync_files: [],
        devices: [],
        setDevices,
    };

    it('should fetch devices when devices prop is null', async () => {
        const mockDevices = [{ device_name: 'test-device', online: true }];
        mockFetchDeviceData.mockResolvedValueOnce(mockDevices);

        const propsWithNullDevices = { ...defaultProps, devices: null };
        
        // Import and call the hook function directly
        const { newUseFileData } = require('../../../components/pages/Files/hooks/newUseFileData');
        newUseFileData(...Object.values(propsWithNullDevices));

        expect(mockFetchDeviceData).toHaveBeenCalledWith(
            'testUser',
            false,
            '',
            expect.objectContaining({
                setFirstname,
                setLastname,
                setDevices,
            })
        );
    });



}); 
