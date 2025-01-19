import { neuranet } from '../../neuranet';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import { handlers } from '../../handlers';
import { CONFIG } from '../../config/config';

export async function scanFolder(
  username: string,
  folder: string,
  onProgress?: (progress: number, speed: string) => void
): Promise<string> {
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
      console.log(`Directory does not exist: ${currentPath}`);
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

        // Update progress
        const progress = Math.round((processedFiles / totalFiles) * 100);
        await neuranet.device.update_scan_progress(username, progress);
        // Call the progress callback if provided
        if (onProgress) {
          const speed = `${Math.round(processedFiles / (Date.now() - startTime) * 1000)} files/s`;
          onProgress(progress, speed);
        }

        // Send files to the server in batches of 1000
        if (filesInfo.length >= 1000) {
          await handlers.files.addFiles(username, filesInfo);
          filesInfo = [];
        }

        // Recursively traverse subdirectories
        if (stats.isDirectory()) {
          await traverseDirectory(filePath);
        }
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        continue;
      }
    }

    // Send any remaining files
    if (filesInfo.length > 0) {
      await handlers.files.addFiles(username, filesInfo);
    }
  }

  const startTime = Date.now();
  try {
    // Count total files first
    totalFiles = await countFiles(folder);

    console.log(`Total files to process: ${totalFiles}`);

    // Start scanning with progress updates
    await traverseDirectory(folder);

    // Final progress update
    await neuranet.device.update_scan_progress(username, 100);
    return 'success';
  } catch (error) {
    console.error('Error during filesystem scan:', error);
    return 'failed';
  }
}
