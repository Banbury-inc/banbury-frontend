// Mock CONFIG before imports
jest.mock('../../config', () => ({
  CONFIG: {
    download_destination: '/mock/downloads',
    full_device_sync: false,
    skip_dot_files: true,
    scan_selected_folders: false,
  },
}));

import { jest } from '@jest/globals';
import fs, { Stats } from 'fs';
import os from 'os';
import path from 'path';
import { scanFilesystem } from '../scanFilesystem';
import { banbury } from '../..';
import { CONFIG } from '../../config';
import { getScannedFolders } from '../getScannedFolders';

// Mock all external dependencies
jest.mock('fs');
jest.mock('os');
jest.mock('path');
jest.mock('../getScannedFolders');
jest.mock('../..', () => ({
  banbury: {
    files: {
      // @ts-ignore - Mock implementation returns Promise<void>
      addFiles: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

interface MockFiles {
  [key: string]: string[];
}

interface FileInfo {
  file_name: string;
  kind: string;
  [key: string]: any;
}

interface GetScannedFoldersSuccess {
  result: 'success';
  username: string;
  scanned_folders: string[];
}


// Create a mock Stats object that matches fs.Stats
const createMockStats = () => ({
  dev: 0,
  ino: 0,
  mode: 0,
  nlink: 0,
  uid: 0,
  gid: 0,
  rdev: 0,
  size: 1024,
  blksize: 4096,
  blocks: 8,
  atimeMs: Date.now(),
  mtimeMs: Date.now(),
  ctimeMs: Date.now(),
  birthtimeMs: Date.now(),
  atime: new Date(),
  mtime: new Date(),
  ctime: new Date(),
  birthtime: new Date(),
  isDirectory: jest.fn(() => false),
  isFile: () => true,
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isSymbolicLink: () => false,
  isFIFO: () => false,
  isSocket: () => false,
}) as unknown as Stats;

describe('scanFilesystem', () => {
  const mockUsername = 'testuser';
  const mockHostname = 'test-device';
  const mockHomeDir = '/home/testuser';
  const mockBCloudDir = '/home/testuser/BCloud';
  const mockFiles: MockFiles = {
    [mockHomeDir]: ['file1.txt', 'file2.jpg', '.hidden', 'subfolder'],
    [mockHomeDir + '/subfolder']: ['file3.pdf', 'file4.mp4'],
    [mockBCloudDir]: ['file5.txt', 'file6.jpg'],
  };
  const mockStats = createMockStats();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock os functions
    (os.hostname as jest.Mock).mockReturnValue(mockHostname);
    (os.homedir as jest.Mock).mockReturnValue(mockHomeDir);

    // Mock fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    // @ts-ignore - Mock implementation returns string[] which is compatible with the actual usage
    (fs.readdirSync as jest.Mock).mockImplementation((path: fs.PathLike) => 
      mockFiles[path.toString()] ?? []
    );
    (fs.statSync as jest.Mock).mockImplementation((filePath: unknown) => {
      const fileStr = typeof filePath === 'string' ? filePath : '';
      return {
        ...createMockStats(),
        isDirectory: () => fileStr === mockHomeDir,
        isFile: () => fileStr !== mockHomeDir,
      };
    });

    // Mock path functions
    // @ts-ignore - Mock implementation for path.join
    (path.join as jest.Mock).mockImplementation((...paths: string[]) => paths.join('/'));
    // @ts-ignore - Mock implementation for path.dirname
    (path.dirname as jest.Mock).mockImplementation((p: string) => p.split('/').slice(0, -1).join('/'));
    // @ts-ignore - Mock implementation for path.extname
    (path.extname as jest.Mock).mockImplementation((p: string) => {
      const parts = p.split('.');
      return parts.length > 1 ? '.' + parts.pop() : '';
    });

    // Mock CONFIG
    Object.defineProperty(CONFIG, 'full_device_sync', { value: false });
    Object.defineProperty(CONFIG, 'skip_dot_files', { value: true });
    Object.defineProperty(CONFIG, 'scan_selected_folders', { value: false });
  });

  it('should scan default BCloud directory when full_device_sync is false', async () => {
    // @ts-ignore - Mock implementation for isDirectory
    (mockStats.isDirectory as jest.Mock).mockImplementation((filePath?: string) => 
      filePath?.includes('subfolder') ?? false
    );
    
    const result = await scanFilesystem();
    
    expect(result).toBe('success');
    expect(banbury.files.addFiles).toHaveBeenCalled();
  });

  it('should scan home directory when full_device_sync is true', async () => {
    Object.defineProperty(CONFIG, 'full_device_sync', { value: true });
    // @ts-ignore - Mock implementation for isDirectory
    (mockStats.isDirectory as jest.Mock).mockImplementation((filePath?: string) => 
      filePath?.includes('subfolder') ?? false
    );
    
    const result = await scanFilesystem();
    
    expect(result).toBe('success');
    expect(banbury.files.addFiles).toHaveBeenCalled();
    expect(fs.readdirSync).toHaveBeenCalledWith(mockHomeDir);
  });

  it('should skip dot files when skip_dot_files is true', async () => {
    const result = await scanFilesystem();
    
    expect(result).toBe('success');
    const addFilesCalls = (banbury.files.addFiles as jest.Mock).mock.calls;
    expect(addFilesCalls.length).toBeGreaterThan(0);
    
    const allAddedFiles = addFilesCalls.flatMap(call => Array.isArray(call[1]) ? call[1] : []) as FileInfo[];
    const hasHiddenFile = allAddedFiles.some(file => file.file_name && file.file_name.startsWith('.'));
    expect(hasHiddenFile).toBe(false);
  });

  it('should scan selected folders when scan_selected_folders is true', async () => {
    Object.defineProperty(CONFIG, 'scan_selected_folders', { value: true });
    const mockSelectedFolders = ['/selected/folder1', '/selected/folder2'];
    const mockResponse: GetScannedFoldersSuccess = {
      result: 'success',
      username: mockUsername,
      scanned_folders: mockSelectedFolders,
    };
    // @ts-ignore - Mock implementation returns Promise<GetScannedFoldersResponse>
    (getScannedFolders as jest.Mock).mockResolvedValue(mockResponse);
    
    const result = await scanFilesystem();
    
    expect(result).toBe('success');
    expect(getScannedFolders).toHaveBeenCalledWith();
    mockSelectedFolders.forEach(folder => {
      expect(fs.readdirSync).toHaveBeenCalledWith(folder);
    });
  });

  it('should handle non-existent directories', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    const result = await scanFilesystem();
    
    expect(result).toBe('success');
    expect(banbury.files.addFiles).not.toHaveBeenCalled();
  });

  it('should handle filesystem errors', async () => {
    (fs.readdirSync as jest.Mock).mockImplementation(() => {
      throw new Error('Permission denied');
    });
    
    const result = await scanFilesystem();
    
    expect(result).toBe('failed, Error: Permission denied');
  });

}); 
