import os from 'os';
import { get_device_id } from '../../device/get_device_id';
import { addDownloadsInfo } from '../../device/add_downloads_info';


// Function to send a download request using the provided socket
export async function download_request(username: string, file_name: string, file_path: string, fileInfo: any, socket: WebSocket, taskInfo: TaskInfo) {

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
  await new Promise<void>((resolve, reject) => {
    const joinMessage = {
      message_type: "join_transfer_room",
      transfer_room: transfer_room
    };


    let joinTimeout: NodeJS.Timeout;
    
    const handleJoinConfirmation = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "transfer_room_joined" && data.transfer_room === transfer_room) {
          clearTimeout(joinTimeout);
          socket.removeEventListener('message', handleJoinConfirmation);
          resolve();
        }
      } catch (error) {
        socket.send(JSON.stringify({'error': 'Invalid JSON response from server', 'details': error}));
      }
    };

    // Set a timeout for joining the room
    joinTimeout = setTimeout(() => {
      socket.removeEventListener('message', handleJoinConfirmation);
      reject(new Error('Timeout waiting for transfer room join confirmation'));
    }, 30000); // 30 second timeout for joining

    socket.addEventListener('message', handleJoinConfirmation);
    socket.send(JSON.stringify(joinMessage));
  });

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

  socket.send(JSON.stringify(message));

  // Return the transfer room for tracking
  return transfer_room;
}

// Add a new function to update download progress
export function updateDownloadProgress(fileInfo: any, bytesReceived: number) {
  const totalSize = fileInfo[0]?.file_size || 0;
  const progress = (bytesReceived / totalSize) * 100;

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

// Add a function to leave a transfer room
export async function leaveTransferRoom(socket: WebSocket, transfer_room: string): Promise<void> {
  try {
    
    // Send leave room request
    socket.send(JSON.stringify({
      message_type: 'leave_transfer_room',
      transfer_room: transfer_room,
      timestamp: Date.now()
    }));
    
    // Wait for confirmation (optional)
    return new Promise((resolve) => {
      const handleResponse = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'left_transfer_room' && data.transfer_room === transfer_room) {
            socket.removeEventListener('message', handleResponse);
            resolve();
          }
        } catch (error) {
          socket.send(JSON.stringify({'error': 'Invalid JSON response from server', 'details': error}));
        }
      };
      
      // Add listener for confirmation
      socket.addEventListener('message', handleResponse);
      
      // Set timeout to resolve anyway after 5 seconds
      setTimeout(() => {
        socket.removeEventListener('message', handleResponse);
        resolve();
      }, 5000);
    });
  } catch (error) {
    socket.send(JSON.stringify({'error': 'Error leaving transfer room', 'details': error}));
  }
}

// Function to send a cancel download request
export async function cancel_download_request(socket: WebSocket, username: string, filename: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket is not open for cancelling download.');
    return;
  }

  try {
    const requesting_device_id = await get_device_id(username);
    const message = {
      message_type: "cancel_download_request",
      username: username,
      filename: filename,
      requesting_device_id: requesting_device_id,
      // We might need transfer_room here if the backend requires it
      // Ideally, the backend can associate filename + requesting_device_id with the active transfer
    };
    socket.send(JSON.stringify(message));
    console.log(`Sent cancel request for file: ${filename}`);

    // Note: This only sends the request. We might need logic here or elsewhere
    // to handle confirmation or update UI state immediately to 'cancelling'.
    // For now, rely on addDownloadsInfo being called separately.

  } catch (error) {
    console.error('Error sending cancel download request:', error);
    // Optionally send an error message back via websocket if appropriate
    // socket.send(JSON.stringify({ 'error': 'Failed to send cancel request', 'details': error }));
  }
} 
