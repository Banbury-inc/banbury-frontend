import { fetchDeviceData } from "../../device/fetchDeviceData";

// Mock the fetchDeviceData function
jest.mock('../../device/fetchDeviceData');
const mockFetchDeviceData = fetchDeviceData as jest.MockedFunction<typeof fetchDeviceData>;

// Mock React hooks
jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useEffect: (cb: Function) => cb(),
    useState: (initialValue: any) => [initialValue, jest.fn()],
}));

describe('newUseFileData', () => {
    // Mock functions

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });





}); 
