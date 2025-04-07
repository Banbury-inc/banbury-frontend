import os from 'os';
import { get_device_id } from '../../device/get_device_id';
import { addDownloadsInfo } from '../../device/add_downloads_info';
import { addUploadsInfo } from '../../device/add_uploads_info';

// Add a map to track total bytes uploaded for each file
const fileUploadProgress = new Map<string, number>();

// Function to send a download request using the provided socket
export async function download_request(username: string, file_name: string, file_path: string, fileInfo: any, socket: WebSocket, taskInfo: TaskInfo) {

  console.log('sending download request:', file_name, file_path, fileInfo);

  // Update taskInfo with the file information
  taskInfo.fileInfo = [{
    file_name: fileInfo[0]?.file_name || file_name,
    file_size: fileInfo[0]?.file_size || 0,
    kind: fileInfo[0]?.kind || 'Unknown'
  }];


  const requesting_device_id = await get_device_id(username);
  const sending_device_id = fileInfo[0]?.device_id;

  // Create unique transfer room name
  const transfer_room = `transfer_${sending_device_id}_${requesting_device_id}`;

  // First join the transfer room
  await new Promise<void>((resolve) => {
    const joinMessage = {
      message_type: "join_transfer_room",
      transfer_room: transfer_room
    };

    console.log('Joining transfer room:', transfer_room);

    socket.send(JSON.stringify(joinMessage));

    // Wait for confirmation that we've joined the room
    const handleJoinConfirmation = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === "transfer_room_joined" && data.transfer_room === transfer_room) {
        socket.removeEventListener('message', handleJoinConfirmation);
        resolve();
      }
    };

    console.log('Waiting for transfer room confirmation...');

    socket.addEventListener('message', handleJoinConfirmation);
  });

  console.log('Joined transfer room:', transfer_room);

  // Create download progress object
  const downloadInfo = {
    filename: fileInfo[0]?.file_name || file_name,
    fileType: fileInfo[0]?.kind || 'Unknown',
    progress: 0,
    status: 'downloading' as const,
    totalSize: fileInfo[0]?.file_size || 0,
    downloadedSize: 0,
    timeRemaining: undefined
  };


  // Add to downloads tracking
  addDownloadsInfo([downloadInfo]);

  console.log('Download info added:', downloadInfo);

  // Now send the actual download request
  const message = {
    message_type: "download_request",
    username: username,
    file_name: file_name,
    file_path: file_path,
    file_info: fileInfo,
    requesting_device_name: os.hostname(),
    requesting_device_id: requesting_device_id,
    sending_device_id: sending_device_id,
    transfer_room: transfer_room
  };


  console.log('socket:', socket);

  socket.send(JSON.stringify(message));
}

// Add a new function to update download progress
export function updateDownloadProgress(fileInfo: any, bytesReceived: number) {
  const totalSize = fileInfo[0]?.file_size || 0;
  const progress = (bytesReceived / totalSize) * 100;

  console.log('Updating download progress');

  // Update the downloads info with new progress
  addDownloadsInfo([{
    filename: fileInfo[0]?.file_name,
    fileType: fileInfo[0]?.kind,
    progress: progress,
    status: progress === 100 ? 'completed' as const : 'downloading' as const,
    totalSize: totalSize,
    downloadedSize: bytesReceived,
    // Could add time remaining calculation here if needed
  }]);
}


// Add this interface
export interface TaskInfo {
  task_name: string;
  task_device: string;
  task_status: string;
  fileInfo?: {
    file_name: string;
    file_size: number;
    kind: string;
  }[];
}

export interface FileSyncRequest {
  message_type: 'file_sync_request';
  download_queue: {
    file_name: string;
    file_path: string;
    file_size: number;
    kind: string;
    device_id: string;
  }[];
}

// Re-export the error handler functions
export { handleTransferError, handleFileSyncError } from '../error_handler'; 
