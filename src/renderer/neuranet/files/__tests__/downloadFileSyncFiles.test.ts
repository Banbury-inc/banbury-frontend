import { downloadFileSyncFiles } from '../downloadFileSyncFiles';
import { neuranet } from '../..';
import { downloadFile } from '../../../handlers/files/downloadFile';
// Mock dependencies
jest.mock('../../../handlers/files/downloadFile');
jest.mock('../..');

describe('downloadFileSyncFiles', () => {
  // Mock functions and setup
  const mockSetTasks = jest.fn();
  const mockSetTaskboxExpanded = jest.fn();
  const mockUsername = 'testUser';
  const mockWebsocket = new WebSocket('ws://mock-url');
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup neuranet sessions mock
    (neuranet.sessions.addTask as jest.Mock).mockResolvedValue({
      id: 'task-1',
      task_progress: 0,
      task_status: 'pending'
    });
    (neuranet.sessions.updateTask as jest.Mock).mockResolvedValue('success');
    (neuranet.sessions.failTask as jest.Mock).mockResolvedValue('success');
  });

  it('should return empty array when no files are available for download', async () => {
    const download_queue = {
      files: [],
      files_available_for_download: 0
    };

    const result = await downloadFileSyncFiles(
      mockUsername,
      download_queue,
      [],
      mockSetTasks,
      mockSetTaskboxExpanded,
      mockWebsocket,
    );

    expect(result).toEqual([]);
    expect(neuranet.sessions.addTask).toHaveBeenCalled();
    expect(neuranet.sessions.updateTask).toHaveBeenCalled();
  });

  it('should successfully download files and update task progress', async () => {
    const download_queue = {
      files: [
        { file_name: 'test1.txt', device_name: 'device1' },
        { file_name: 'test2.txt', device_name: 'device1' }
      ],
      files_available_for_download: 2
    };

    (downloadFile as jest.Mock).mockResolvedValue('success');

    const result = await downloadFileSyncFiles(
      mockUsername,
      download_queue,
      [],
      mockSetTasks,
      mockSetTaskboxExpanded,
      mockWebsocket,
    );

    expect(result).toEqual(['test1.txt', 'test2.txt']);
    expect(downloadFile).toHaveBeenCalledTimes(2);
    expect(neuranet.sessions.updateTask).toHaveBeenCalled();
    expect(mockSetTaskboxExpanded).toHaveBeenCalledWith(true);
  });

  it('should handle download failures and update task accordingly', async () => {
    const download_queue = {
      files: [
        { file_name: 'test1.txt', device_name: 'device1' }
      ],
      files_available_for_download: 1
    };

    (downloadFile as jest.Mock).mockRejectedValue('device_offline');

    const result = await downloadFileSyncFiles(
      mockUsername,
      download_queue,
      [],
      mockSetTasks,
      mockSetTaskboxExpanded,
      mockWebsocket,
    );

    expect(result).toEqual([]);
    expect(neuranet.sessions.failTask).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
}); 
