import os from 'os';
import { getDeviceId } from '../../device/getDeviceId';
import { addDownloadsInfo, DownloadInfo } from '../../device/addDownloadsInfo';


// Function to send a download request using the provided socket
export async function download_request(file_name: string, file_path: string, fileInfo: any, socket: WebSocket, taskInfo: TaskInfo) {

  // Update taskInfo with the file information
  taskInfo.fileInfo = [{
    file_name: fileInfo[0]?.file_name || file_name,
    file_size: fileInfo[0]?.file_size || 0,
    kind: fileInfo[0]?.kind || 'Unknown'
  }];

  const requesting_device_id_obj = await getDeviceId();
  const sending_device_id = fileInfo[0]?.device_id;

  // Extract the actual device ID from the response object
  const requesting_device_id_str = requesting_device_id_obj.result === 'success' ? 
    requesting_device_id_obj.message : 
    `unknown_${Date.now()}`;

  // Create unique transfer room name using the extracted device ID string
  const transfer_room = `transfer_${sending_device_id}_${requesting_device_id_str}`;

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
  const downloadInfo: DownloadInfo = {
    filename: fileInfo[0]?.file_name || file_name,
    fileType: fileInfo[0]?.kind || 'Unknown',
    progress: 0,
    status: 'downloading' as const,
    totalSize: fileInfo[0]?.file_size || 0,
    downloadedSize: 0,
    timeRemaining: undefined,
    sending_device_id: sending_device_id,
    transfer_room: transfer_room,
  };

  // Add to downloads tracking
  addDownloadsInfo([downloadInfo]);

  // Now send the actual download request
  const message = {
    message_type: "download_request",
    file_name: file_name,
    file_path: file_path,
    file_info: fileInfo,
    requesting_device_name: os.hostname(),
    requesting_device_id: requesting_device_id_str,
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
export async function cancel_download_request(socket: WebSocket, username: string, downloadInfo: DownloadInfo) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket is not open for cancelling download.');
    return;
  }

  if (!downloadInfo.sending_device_id || !downloadInfo.transfer_room) {
    console.error('Cannot cancel download: Missing sending_device_id or transfer_room in DownloadInfo', downloadInfo);
    // Optionally update the download status to failed locally
    addDownloadsInfo([{ ...downloadInfo, status: 'failed' }]); 
    return;
  }

  try {
    // Immediately update the UI to show canceled status
    addDownloadsInfo([{ 
      ...downloadInfo, 
      status: 'canceled',
      timeRemaining: undefined 
    }]);
    
    const requesting_device_id_obj = await getDeviceId();
    // Extract the actual device ID string
    const requesting_device_id_str = requesting_device_id_obj.result === 'success' ? 
      requesting_device_id_obj.message : 
      `unknown_${Date.now()}`;
      
    const message = {
      message_type: "cancel_download_request",
      username: username,
      filename: downloadInfo.filename,
      requesting_device_id: requesting_device_id_str,
      // Add the required fields for the backend handler
      sending_device_id: downloadInfo.sending_device_id,
      transfer_room: downloadInfo.transfer_room,
    };
    socket.send(JSON.stringify(message));

  } catch (error) {
    console.error('Error sending cancel download request:', error);
    // Update status to failed locally on error
    addDownloadsInfo([{ ...downloadInfo, status: 'failed' }]); 
  }
} 
