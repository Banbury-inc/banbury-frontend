
import os from 'os';
import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import { CONFIG } from '../../config/config';

export async function save_snapshot(username: string) {
  const fullDeviceSync = CONFIG.full_device_sync;
  const skipDotFiles = CONFIG.skip_dot_files;

  // Determine the directory path based on the fullDeviceSync flag
  const bcloudDirectoryPath = fullDeviceSync ? os.homedir() : path.join(os.homedir(), 'BCloud');

  const filesInfo: any[] = [];

  // Check if the directory exists, create if it does not and create a welcome text file
  if (!fs.existsSync(bcloudDirectoryPath)) {
    fs.mkdirSync(bcloudDirectoryPath, { recursive: true });
    const welcomeFilePath = path.join(bcloudDirectoryPath, 'welcome.txt');
    fs.writeFileSync(
      welcomeFilePath,
      `Welcome to Banbury Cloud! This is the directory that will contain all of the files that you would like to have in the cloud and streamed throughout all of your devices.`
    );
  }

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

  async function traverseDirectory(currentPath: string): Promise<void> {
    const files = fs.readdirSync(currentPath);

    for (const filename of files) {
      const filePath = path.join(currentPath, filename);
      const stats = fs.statSync(filePath);


      // Skip dot directories if configured to do so
      if (skipDotFiles && filename.startsWith('.')) continue;

      try {
        const fileInfo = {
          file_type: stats.isDirectory() ? 'directory' : 'file',
          file_name: filename,
          device_name: os.hostname(),
          file_path: filePath,
          date_uploaded: DateTime.fromMillis(stats.birthtimeMs).toFormat('yyyy-MM-dd HH:mm:ss'),
          date_modified: DateTime.fromMillis(stats.mtimeMs).toFormat('yyyy-MM-dd HH:mm:ss'),
          file_size: stats.isDirectory() ? 0 : stats.size,
          file_priority: 1,
          file_parent: path.dirname(filePath),
          original_device: os.hostname(),
          kind: stats.isDirectory() ? 'Folder' : getFileKind(filename),
        };

        filesInfo.push(fileInfo);

        // Recursively traverse subdirectories
        if (stats.isDirectory()) {
          await traverseDirectory(filePath);
        }
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        // Continue with the next file
        continue;
      }
    }
  }

  // Start processing the directories
  await traverseDirectory(bcloudDirectoryPath);


  // Save snapshot to a JSON file
  const snapshotFilePath = path.join(bcloudDirectoryPath, `${username}_snapshot.json`);
  fs.writeFileSync(snapshotFilePath, JSON.stringify(filesInfo, null, 2));


  return 'success';
}

save_snapshot('mmills');
