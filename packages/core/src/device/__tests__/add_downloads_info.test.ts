import { addDownloadsInfo, getDownloadsInfo, clearDownloadsInfo, cleanupDownloadTracker, DownloadInfo } from '../addDownloadsInfo';

describe('add_downloads_info', () => {
  beforeEach(() => {
    clearDownloadsInfo();
  });

  describe('addDownloadsInfo', () => {
    it('should add new downloads', () => {
      const newDownloads: DownloadInfo[] = [{
        filename: 'test1.txt',
        fileType: 'text',
        progress: 0,
        status: 'downloading',
        totalSize: 1000,
        downloadedSize: 0
      }];

      const result = addDownloadsInfo(newDownloads);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        filename: 'test1.txt',
        progress: 0,
        status: 'downloading'
      }));
    });

    it('should update existing downloads', () => {
      const initialDownloads: DownloadInfo[] = [{
        filename: 'test1.txt',
        fileType: 'text',
        progress: 0,
        status: 'downloading',
        totalSize: 1000,
        downloadedSize: 0
      }];

      addDownloadsInfo(initialDownloads);

      const updatedDownloads: DownloadInfo[] = [{
        filename: 'test1.txt',
        fileType: 'text',
        progress: 50,
        status: 'downloading',
        totalSize: 1000,
        downloadedSize: 500
      }];

      const result = addDownloadsInfo(updatedDownloads);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        filename: 'test1.txt',
        progress: 50,
        downloadedSize: 500
      }));
    });

    it('should handle unknown filename updates', () => {
      const initialDownloads: DownloadInfo[] = [{
        filename: 'test1.txt',
        fileType: 'text',
        progress: 0,
        status: 'downloading',
        totalSize: 1000,
        downloadedSize: 0
      }];

      addDownloadsInfo(initialDownloads);

      const unknownDownload: DownloadInfo[] = [{
        filename: 'Unknown',
        fileType: 'text',
        progress: 50,
        status: 'downloading',
        totalSize: 1000,
        downloadedSize: 500
      }];

      const result = addDownloadsInfo(unknownDownload);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        filename: 'test1.txt',
        progress: 50,
        downloadedSize: 500
      }));
    });

    it('should calculate time remaining for downloads', () => {
      const download: DownloadInfo[] = [{
        filename: 'test1.txt',
        fileType: 'text',
        progress: 0,
        status: 'downloading',
        totalSize: 1000,
        downloadedSize: 0
      }];

      const result = addDownloadsInfo(download);
      expect(result[0].timeRemaining).toBeDefined();
    });
  });

  describe('getDownloadsInfo', () => {
    it('should return empty array when no downloads', () => {
      const result = getDownloadsInfo();
      expect(result).toEqual([]);
    });

    it('should return current downloads', () => {
      const downloads: DownloadInfo[] = [{
        filename: 'test1.txt',
        fileType: 'text',
        progress: 0,
        status: 'downloading',
        totalSize: 1000,
        downloadedSize: 0
      }];

      addDownloadsInfo(downloads);
      const result = getDownloadsInfo();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        filename: 'test1.txt'
      }));
    });
  });

  describe('clearDownloadsInfo', () => {
    it('should clear all downloads', () => {
      const downloads: DownloadInfo[] = [{
        filename: 'test1.txt',
        fileType: 'text',
        progress: 0,
        status: 'downloading',
        totalSize: 1000,
        downloadedSize: 0
      }];

      addDownloadsInfo(downloads);
      clearDownloadsInfo();
      const result = getDownloadsInfo();
      expect(result).toEqual([]);
    });
  });

  describe('cleanupDownloadTracker', () => {
    it('should remove download from tracker', () => {
      const filename = 'test1.txt';
      cleanupDownloadTracker(filename);
      // Since the tracker is internal, we can't directly verify its state
      // But we can verify that the function doesn't throw
      expect(() => cleanupDownloadTracker(filename)).not.toThrow();
    });
  });
}); 
