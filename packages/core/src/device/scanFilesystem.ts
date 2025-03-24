import { banbury } from '..';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import { CONFIG } from '../config';
import { get_scanned_folders } from './get_scanned_folders';

export async function scanFilesystem(username: string): Promise<string> {
  const fullDeviceSync = CONFIG.full_device_sync;
  const skipDotFiles = CONFIG.skip_dot_files;
  const scanSelectedFolders = CONFIG.scan_selected_folders;
  let totalFiles = 0;
  let processedFiles = 0;

  // Function to count total files
  async function countFiles(currentPath: string): Promise<number> {
    if (!fs.existsSync(currentPath)) return 0;
    let count = 0;
    const files = fs.readdirSync(currentPath);

    for (const filename of files) {
      if (skipDotFiles && filename.startsWith('.')) continue;
      const filePath = path.join(currentPath, filename);
      const stats = fs.statSync(filePath);
      count++;
      if (stats.isDirectory()) {
        count += await countFiles(filePath);
      }
    }
    return count;
  }

  // Function to get file kind (unchanged)
  function getFileKind(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const fileTypes: { [key: string]: string } = {
      '.png': 'Image',
      '.jpg': 'Image',
      '.jpeg': 'Image',
      '.gif': 'Image',
      '.bmp': 'Image',
      '.svg': 'Image',
      '.mp4': 'Video',
      '.mov': 'Video',
      '.avi': 'Video',
      '.mp3': 'Audio',
      '.wav': 'Audio',
      '.pdf': 'Document',
      '.doc': 'Document',
      '.docx': 'Document',
      '.txt': 'Text',
      // Add more file types as needed
    };
    return fileTypes[ext] || 'Unknown';
  }

  // Modified traverseDirectory function to update progress
  async function traverseDirectory(currentPath: string): Promise<void> {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const files = fs.readdirSync(currentPath);
    let filesInfo: any[] = [];

    for (const filename of files) {
      if (skipDotFiles && filename.startsWith('.')) continue;

      const filePath = path.join(currentPath, filename);
      const stats = fs.statSync(filePath);

      try {
        const fileInfo = {
          file_type: stats.isDirectory() ? 'directory' : 'file',
          file_name: filename,
          file_path: filePath,
          date_uploaded: DateTime.fromMillis(stats.birthtimeMs).toFormat('yyyy-MM-dd HH:mm:ss'),
          date_modified: DateTime.fromMillis(stats.mtimeMs).toFormat('yyyy-MM-dd HH:mm:ss'),
          file_size: stats.isDirectory() ? 0 : stats.size,
          file_priority: 1,
          file_parent: path.dirname(filePath),
          original_device: os.hostname(),
          kind: stats.isDirectory() ? 'Folder' : getFileKind(filename),
          shared_with: [],
          is_public: false,
        };

        filesInfo.push(fileInfo);
        processedFiles++;

        // Send files to the server in batches of 1000
        if (filesInfo.length >= 1000) {
          await banbury.files.addFiles(username, filesInfo);
          filesInfo = [];
        }

        // Recursively traverse subdirectories
        if (stats.isDirectory()) {
          await traverseDirectory(filePath);
        }
      } catch (error) {
        console.error(`Error processing file: ${filePath}`, error);
        continue;
      }
    }

    // Send any remaining files
    if (filesInfo.length > 0) {
      await banbury.files.addFiles(username, filesInfo);
    }
  }

  let directoriesToScan: string[] = [];

  if (scanSelectedFolders) {
    // Get the array of scanned folders from get_scanned_folders
    const response = await get_scanned_folders(username);
    if (typeof response === 'object' && 'result' in response && response.result === 'success') {
      if ('scanned_folders' in response && Array.isArray(response.scanned_folders)) {
        directoriesToScan = response.scanned_folders;
      } else {
        return 'No valid folders to scan';
      }
    } else {
      return 'Failed to get scanned folders';
    }

    if (directoriesToScan.length === 0) {
      return 'No folders to scan';
    }
  } else {
    // If not scanning selected folders, use the default directory
    const defaultDirectory = fullDeviceSync ? os.homedir() : path.join(os.homedir(), 'BCloud');
    directoriesToScan = [defaultDirectory];
  }

  try {
    // Count total files first
    for (const directory of directoriesToScan) {
      totalFiles += await countFiles(directory);
    }

    // Start scanning with progress updates
    for (const directory of directoriesToScan) {
      await traverseDirectory(directory);
    }

    return 'success';
  } catch (error) {
    return 'failed, ' + error;
  }
}
