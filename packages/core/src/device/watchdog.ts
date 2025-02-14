import chokidar from 'chokidar';
import { CONFIG } from '../config';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { DateTime } from 'luxon';
import { banbury } from '..'
import { EventEmitter } from 'events';


export const fileWatcherEmitter = new EventEmitter();


// Define the file name and paths
const file_name: string = 'mmills_database_snapshot.json';
const directory_name: string = 'BCloud';
const directory_path: string = path.join(os.homedir(), directory_name);
const snapshot_json: string = path.join(directory_path, file_name);



function getFileKind(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  const fileTypes: { [key: string]: string } = {
    '.png': 'Image',
    '.jpg': 'Image',
    '.JPG': 'Image',
    '.jpeg': 'Image',
    '.gi': 'Image',
    '.bmp': 'Image',
    '.svg': 'Image',
    '.mp4': 'Video',
    '.mov': 'Video',
    '.webm': 'Video',
    '.avi': 'Video',
    '.mkv': 'Video',
    '.wmv': 'Video',
    '.flv': 'Video',
    '.mp3': 'Audio',
    '.wav': 'Audio',
    '.aac': 'Audio',
    '.flac': 'Audio',
    '.ogg': 'Audio',
    '.wma': 'Audio',
    '.pdf': 'Document',
    '.doc': 'Document',
    '.docx': 'Document',
    '.xls': 'Document',
    '.xlsx': 'Document',
    '.ppt': 'Document',
    '.pptx': 'Document',
    '.txt': 'Text',
    '.csv': 'Data',
    '.json': 'Data',
    '.xml': 'Data',
    '.zip': 'Archive',
    '.rar': 'Archive',
    '.7z': 'Archive',
    '.tar': 'Archive',
    '.gz': 'Archive',
    '.exe': 'Executable',
    '.dll': 'Executable',
    '.sh': 'Script',
    '.cpp': 'Script',
    '.ts': 'Script',
    '.bat': 'Script',
    '.rs': 'Script',
    '.py': 'Script',
    '.js': 'Script',
    '.html': 'Web',
    '.css': 'Web',
    // Add more file extensions as needed
  };
  return fileTypes[ext] || 'unknown';
}



// Function that gets triggered when a new file is added
function onFileAdded(filePath: string, username: string) {

  const stats = fs.statSync(filePath);
  let filesInfo: any[] = [];
  const fileInfo = {
    "file_name": path.basename(filePath),
    "file_path": filePath,
    "file_type": stats.isDirectory() ? "directory" : "file",
    "date_uploaded": DateTime.fromMillis(stats.birthtimeMs).toFormat('yyyy-MM-dd HH:mm:ss'),
    "date_modified": DateTime.fromMillis(stats.mtimeMs).toFormat('yyyy-MM-dd HH:mm:ss'),
    "file_size": stats.isDirectory() ? 0 : stats.size,  // Size is 0 for directories
    "file_priority": 1,
    "file_parent": path.dirname(filePath),
    "original_device": os.hostname(),  // Assuming the current device name as the original device
    "kind": stats.isDirectory() ? 'Folder' : getFileKind(filePath),
    "device_name": os.hostname(),
  };

  filesInfo.push(fileInfo);



  // Read the snapshot JSON file
  const data = fs.readFileSync(snapshot_json, 'utf8');
  const database_snapshot = JSON.parse(data);  // Parse JSON data


  // Check if the file already exists in the snapshot
  const existingFileIndex = database_snapshot.findIndex(
    (file: { file_name: string; file_path: string }) =>
      file.file_name === path.basename(filePath) && file.file_path === filePath
  );

  if (existingFileIndex !== -1) {
    // If the file already exists, update the existing entry
    database_snapshot[existingFileIndex] = fileInfo;
  } else {
    // If the file does not exist, add the new file to the snapshot
    database_snapshot.push(fileInfo);
  }

  // Write the updated JSON back to the file
  fs.writeFileSync(snapshot_json, JSON.stringify(database_snapshot, null, 2), 'utf8');

  fileWatcherEmitter.emit('fileChanged');



  // Call the handler to add files
  banbury.files.addFiles(username, filesInfo);

  filesInfo = [];
}

// Function that gets triggered when a new file is added
function onFileDeleted(filePath: string, username: string) {


  let filesInfo: any[] = [];
  const fileInfo = {
    "file_type": "",
    "file_name": path.basename(filePath),
    "file_path": filePath,
    'device_name': os.hostname(),
    "date_uploaded": '',
    "date_modified": '',
    "file_size": '',  // Size is 0 for directories
    "file_priority": 1,
    "file_parent": '',
    "original_device": '', // Assuming the current device name as the original device
    "kind": '',


  };

  filesInfo.push(fileInfo);


  // Read the snapshot JSON file
  const data = fs.readFileSync(snapshot_json, 'utf8');
  let database_snapshot = JSON.parse(data);  // Parse JSON data

  // File to delete (you can adjust this filePath)
  const file_name_to_delete = path.basename(filePath);
  const file_path_to_delete = path.join(path.dirname(filePath), path.basename(filePath));

  // Search and remove the matching entry in the JSON array
  database_snapshot = database_snapshot.filter(
    (file: { file_name: string; file_path: string }) =>
      !(file.file_name === file_name_to_delete && file.file_path === file_path_to_delete)
  );

  // Write the updated JSON back to the file
  fs.writeFileSync(snapshot_json, JSON.stringify(database_snapshot, null, 2), 'utf8');



  fileWatcherEmitter.emit('fileChanged');


  // Call the handler to remove files (adjust the neuranet logic as needed)
  banbury.files.removeFiles(username, os.hostname(), filesInfo);

  filesInfo = [];
}



// Function to handle file change events
export function detectFileChanges(directoryPath: string, username: string) {
  // Initialize the watcher
  const watcher = chokidar.watch(directoryPath, {
    persistent: true,
    ignoreInitial: true, // Whether to ignore adding events when starting
    depth: 10, // How deep to traverse directories
  });

  // Event listeners
  watcher
    .on('add', (filePath) => {
      onFileAdded(filePath, username); // Call the onFileAdded function
    })
    .on('unlink', (filePath) => {
      onFileDeleted(filePath, username); // Call the onFileAdded function
    })
    .on('change', () => {
      // Silently handle file changes
    })
    .on('addDir', () => {
      // Silently handle directory additions
    })
    .on('unlinkDir', () => {
      // Silently handle directory removals
    })
    .on('error', () => {
      // Silently handle errors
    })
    .on('ready', () => {
      // Silently handle ready state
    });
}

// Usage Example
const fullDeviceSync = CONFIG.full_device_sync;
const bcloudDirectoryPath = fullDeviceSync ? os.homedir() : path.join(os.homedir(), 'BCloud');

// Start detecting file changes
detectFileChanges(bcloudDirectoryPath, 'mmills');

