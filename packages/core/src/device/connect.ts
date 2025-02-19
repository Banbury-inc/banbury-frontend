import path from 'path';
import os from 'os';
import fs from 'fs';
import { CONFIG } from '../config';
import { addDownloadsInfo } from './add_downloads_info';
import { addUploadsInfo } from './add_uploads_info';
import { get_device_id } from './get_device_id';
import { getDeviceInfo } from './deviceInfo';
import banbury from '..';

// Add state all file chunks with a reset function
let accumulatedData: Buffer[] = [];

function resetAccumulatedData() {
  accumulatedData = [];
}

// Function to handle the received file chunk in binary form
export function handleReceivedFileChunk(data: ArrayBuffer, downloadDetails: {
  filename: string | null;
  fileType: string | null;
  totalSize: number;
}) {
  try {
    const chunkBuffer = Buffer.from(data);
    if (chunkBuffer.length > 0) {
      accumulatedData.push(chunkBuffer);

      // Calculate total received bytes
      const totalReceived = accumulatedData.reduce((sum, chunk) => sum + chunk.length, 0);

      // Update download progress
      const downloadInfo = {
        filename: downloadDetails.filename || 'Unknown',
        fileType: downloadDetails.fileType || 'Unknown',
        progress: (totalReceived / downloadDetails.totalSize) * 100,
        status: 'downloading' as const,
        totalSize: downloadDetails.totalSize,
        downloadedSize: totalReceived,
        timeRemaining: calculateTimeRemaining(
          totalReceived,
          downloadDetails.totalSize,
          downloadDetails.filename || 'Unknown'
        )
      };

      console.log("Download info:", downloadInfo);

      addDownloadsInfo([downloadInfo]);
    }
  } catch (error) {
    console.error('Error processing file chunk:', error);
    throw error;
  }
}

// Add a map to track download speed calculations
const downloadSpeedTracker = new Map<string, {
  lastUpdate: number;
  lastSize: number;
  speedSamples: number[];
  lastTimeRemaining?: number;
}>();

function calculateTimeRemaining(downloadedSize: number, totalSize: number, filename: string): number | undefined {
  if (totalSize <= downloadedSize) {
    return undefined;
  }

  const now = Date.now();
  const tracker = downloadSpeedTracker.get(filename) || {
    lastUpdate: now,
    lastSize: 0,
    speedSamples: [],
    lastTimeRemaining: undefined
  };

  // Calculate current speed (bytes per second)
  const timeDiff = (now - tracker.lastUpdate) / 1000; // Convert to seconds
  const sizeDiff = downloadedSize - tracker.lastSize;

  if (timeDiff > 0) {
    const currentSpeed = sizeDiff / timeDiff;

    // Keep last 5 speed samples for averaging
    tracker.speedSamples.push(currentSpeed);
    if (tracker.speedSamples.length > 5) {
      tracker.speedSamples.shift();
    }

    // Calculate average speed
    const averageSpeed = tracker.speedSamples.reduce((a, b) => a + b, 0) / tracker.speedSamples.length;

    // Update tracker
    tracker.lastUpdate = now;
    tracker.lastSize = downloadedSize;

    // Calculate remaining time in seconds
    const remainingBytes = totalSize - downloadedSize;
    const timeRemaining = Math.ceil(remainingBytes / averageSpeed);

    // Store the new time remaining
    tracker.lastTimeRemaining = timeRemaining > 0 ? timeRemaining : 1;
    downloadSpeedTracker.set(filename, tracker);

    return tracker.lastTimeRemaining;
  }

  // Update tracker but keep the last known time remaining
  downloadSpeedTracker.set(filename, {
    ...tracker,
    lastUpdate: now,
    lastSize: downloadedSize
  });

  // Return the last known time remaining or a rough estimate
  return tracker.lastTimeRemaining || Math.ceil((totalSize - downloadedSize) / 1000000);
}

// Add cleanup function for downloads
export function cleanupDownloadTracker(filename: string) {
  downloadSpeedTracker.delete(filename);
}

// Function to save the accumulated file after all chunks are received
function saveFile(fileName: string, file_path: string) {
  console.log("Saving file:", fileName, "from path:", file_path);
  console.log("Total accumulated chunks:", accumulatedData.length);

  try {
    // Always save to Downloads folder
    const userHomeDirectory = os.homedir();
    const downloadsPath = path.join(userHomeDirectory, 'Downloads');
    console.log("Saving to downloads path:", downloadsPath);

    // Create Downloads directory if it doesn't exist
    if (!fs.existsSync(downloadsPath)) {
      fs.mkdirSync(downloadsPath, { recursive: true });
    }

    // Create final file path in Downloads
    const filePath = path.join(downloadsPath, fileName);
    console.log("Final file path:", filePath);

    // Combine all chunks and verify we have data
    const completeBuffer = Buffer.concat(accumulatedData);
    console.log("Complete file size:", completeBuffer.length);

    if (completeBuffer.length === 0) {
      throw new Error('No data accumulated to save');
    }

    // Write file synchronously to ensure completion
    fs.writeFileSync(filePath, completeBuffer);
    console.log("File written successfully");

    addDownloadsInfo([{
      filename: fileName,
      fileType: 'Unknown',
      progress: 100,
      status: 'completed' as const,
      totalSize: 0,
      downloadedSize: completeBuffer.length,
      timeRemaining: undefined
    }]);

    // Clear accumulated data only after successful save
    resetAccumulatedData();
    return 'success';
  } catch (error) {
    console.error('Error saving file:', error);
    // Reset accumulated data on error to prevent corruption
    resetAccumulatedData();
    throw error;
  }
}

function handleTransferError(
  errorType: 'save_error' | 'file_not_found' | 'device_offline' | 'permission_denied' | 'transfer_failed',
  fileName: string,
  tasks: any[] | null,
  setTasks: ((tasks: any[]) => void) | null,
  setTaskbox_expanded: ((expanded: boolean) => void) | null,
  deviceName?: string
) {
  if (!tasks || !setTasks || !setTaskbox_expanded) {
    console.error('Missing required parameters for error handling');
    return;
  }

  const errorMessages = {
    save_error: `Failed to save file: ${fileName}`,
    file_not_found: `File not found: ${fileName}`,
    device_offline: `Device ${deviceName} is offline`,
    permission_denied: `Permission denied for file: ${fileName}`,
    transfer_failed: `Transfer failed for file: ${fileName}`,
  };

  const updatedTasks = tasks.map((task: any) =>
    task.file_name === fileName
      ? { ...task, status: 'error', error_message: errorMessages[errorType] }
      : task
  );

  setTasks(updatedTasks);
  setTaskbox_expanded(true);
}

// Function to create a WebSocket connection and invoke the callback after the connection is open
// Add reconnection configuration
const RECONNECT_CONFIG = {
  initialDelay: 1000, // Start with 1 second delay
  maxDelay: 30000,    // Max delay of 30 seconds
  maxAttempts: 5      // Maximum number of reconnection attempts
};

// Add state for reconnection
let reconnectAttempt = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;

// Add reconnection function
function attemptReconnect(
  username: string,
  device_name: string,
  taskInfo: any,
  tasks: any[],
  setTasks: (tasks: any[]) => void,
  setTaskbox_expanded: (expanded: boolean) => void,
  callback: (socket: WebSocket) => void
) {
  if (reconnectAttempt >= RECONNECT_CONFIG.maxAttempts) {
    console.error('Max reconnection attempts reached');
    return;
  }

  const delay = Math.min(
    RECONNECT_CONFIG.initialDelay * Math.pow(2, reconnectAttempt),
    RECONNECT_CONFIG.maxDelay
  );

  console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempt + 1})`);

  reconnectTimeout = setTimeout(() => {
    createWebSocketConnection(
      username,
      device_name,
      taskInfo,
      tasks,
      setTasks,
      setTaskbox_expanded,
      callback
    );
  }, delay);

  reconnectAttempt++;
}

// Add this interface near the top of the file
interface TaskInfo {
  task_name: string;
  task_device: string;
  task_status: string;
  fileInfo?: {
    file_name: string;
    file_size: number;
    kind: string;
  }[];
}

export async function createWebSocketConnection(
  username: string,
  device_name: string,
  taskInfo: TaskInfo,
  tasks: any[],
  setTasks: (tasks: any[]) => void,
  setTaskbox_expanded: (expanded: boolean) => void,
  callback: (socket: WebSocket) => void
) {
  // Check if the native WebSocket is available (i.e., in browser)
  const WebSocketClient = typeof window !== 'undefined' ? WebSocket : require('ws');

  let socket: WebSocket;

  const url_ws = banbury.config.url_ws;
        
  const device_id = await get_device_id(username);
  console.log("Device ID:", device_id);
  console.log("Using WebSocket URL:", url_ws);
  // Ensure device_id is properly encoded and add slash after base URL
  const entire_url_ws = `${url_ws}${device_id}/`;
  // Replace the URL with your WebSocket endpoint
  socket = new WebSocketClient(entire_url_ws);

  // Set WebSocket to receive binary data as a string
  socket.binaryType = 'arraybuffer';

  // Open event: When the connection is established
  socket.onopen = function () {
    console.log('WebSocket connection established');
    reconnectAttempt = 0; // Reset attempt counter on successful connection

    const message = {
      message_type: `initiate_live_data_connection`,
      username: username,
      device_name: device_name,
      run_device_info_loop: CONFIG.run_device_info_loop,
      run_device_predictions_loop: CONFIG.run_device_predictions_loop,
    };
    socket.send(JSON.stringify(message));

    // Call the callback function with the socket
    callback(socket);
  };

  // Message event: When a message or file is received from the server
  socket.onmessage = async function (event: any) {
    console.log("Received message:", event);

    // Check if the received data is binary (ArrayBuffer)
    if (event.data instanceof ArrayBuffer) {
      const downloadDetails = {
        filename: 'Unknown',
        fileType: 'Unknown',
        totalSize: 0,
        progress: 0,
        status: 'downloading' as const,
        downloadedSize: 0,
        timeRemaining: undefined
      };
      handleReceivedFileChunk(event.data, downloadDetails);



    } else {
      try {
        const data = JSON.parse(event.data);
        console.log("Received JSON message:", data);

        // Handle messages based on type and message fields
        if (data.request_type === "file_request") {
          console.log("Received file request:", data);
          const file_path = data.file_path;
          const file_name = data.file_name;

          try {
            const fileStream = fs.createReadStream(file_path);

            // Get file stats to know the total size
            const stats = fs.statSync(file_path);
            const fileInfo = {
              file_name: file_name,
              file_size: stats.size,
              kind: path.extname(file_name).slice(1) || 'Unknown'
            };

            // Initialize upload progress
            const initialUploadInfo = {
              filename: fileInfo.file_name,
              fileType: fileInfo.kind,
              progress: 0,
              status: 'uploading' as const,
              totalSize: fileInfo.file_size,
              uploadedSize: 0,
              timeRemaining: undefined
            };
            addUploadsInfo([initialUploadInfo]);

            fileStream.on('error', () => {
              const message = {
                message_type: 'file_not_found',
                username: username,
                requesting_device_name: data.requesting_device_name,
                file_name: file_name,
              };
              socket.send(JSON.stringify(message));
            });

            // Add handlers for reading and sending the file
            fileStream.on('data', (chunk) => {
              console.log('Sending chunk, size:', chunk.length);
              socket.send(chunk);
              // Track upload progress with our enhanced fileInfo
              handleUploadProgress(chunk, fileInfo);
            });

            fileStream.on('end', () => {
              const message = {
                message_type: 'file_sent_successfully',
                username: username,
                requesting_device_id: data.requesting_device_id,
                sending_device_name: device_name,
                sending_device_id: device_id,
                file_name: file_name,
                file_path: file_path
              };
              socket.send(JSON.stringify(message));

              // Ensure we mark the upload as completed
              if (data.file_info) {
                const uploadInfo = {
                  filename: data.file_info.file_name,
                  fileType: data.file_info.kind || 'Unknown',
                  progress: 100,
                  status: 'completed' as const,
                  totalSize: data.file_info.file_size || 0,
                  uploadedSize: data.file_info.file_size || 0,
                  timeRemaining: undefined
                };
                addUploadsInfo([uploadInfo]);
                fileUploadProgress.delete(data.file_info.file_name);
              }
            });
          } catch (error) {
            console.error('Error reading file:', error);
            const message = {
              message_type: 'file_not_found',
              username: username,
              requesting_device_name: data.requesting_device_name,
              file_name: file_name,
            };
            socket.send(JSON.stringify(message));
          }
        } else if (data.type === "file_sent_successfully" || data.message === "File sent successfully") {
          console.log("File transfer complete, saving file:", data.file_name);
          try {
            const result = saveFile(data.file_name, data.file_path || '');
            console.log("File saved successfully:", result);

            // Send completion confirmation
            const final_message = {
              message_type: 'file_transaction_complete', // Changed to match expected message type
              username: username,
              requesting_device_name: device_name,
              sending_device_name: data.sending_device_name,
              file_name: data.file_name,
              file_path: data.file_path
            };
            socket.send(JSON.stringify(final_message));
            console.log("Sent completion confirmation:", final_message);

            // Update task status if available
            if (tasks && setTasks) {
              const updatedTasks = tasks.map((task: any) =>
                task.file_name === data.file_name
                  ? { ...task, status: 'complete' }
                  : task
              );
              setTasks(updatedTasks);
            }
          } catch (error) {
            console.error('Error saving file:', error);
            handleTransferError(
              'save_error',
              data.file_name,
              tasks,
              setTasks,
              setTaskbox_expanded
            );
          }
        } else {
          // Handle other message types in switch statement
          switch (data.message) {
            case 'Start file transfer':
              console.log("Starting new file transfer");
              resetAccumulatedData();
              break;

            case 'File transfer complete':
            case 'File transaction complete':
              // These cases are now handled above
              break;

            case 'File not found':
              console.log(`File not found: ${data.file_name}`);
              handleTransferError(
                'file_not_found',
                data.file_name,
                tasks,
                setTasks,
                setTaskbox_expanded
              );
              break;

            case 'Device offline':
              console.log(`Device offline: ${data.sending_device_name}`);
              handleTransferError(
                'device_offline',
                data.file_name,
                tasks,
                setTasks,
                setTaskbox_expanded,
                data.sending_device_name
              );
              break;

            default:
              console.log("Unhandled message type:", data.message);
              break;
          }
        }

        if (data.request_type === 'device_info') {
          const device_info = await getDeviceInfo();
          const message = {
            message: `device_info_response`,
            username: username,
            sending_device_name: device_name,
            requesting_device_name: data.requesting_device_name,
            device_info: device_info,
          };
          socket.send(JSON.stringify(message));
        }

      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  };

  // Close event: When the WebSocket connection is closed
  socket.onclose = function (event) {
    console.log('WebSocket connection closed:', event.code, event.reason);

    // Don't attempt reconnection if the closure was intentional (code 1000)
    if (event.code !== 1000) {
      attemptReconnect(
        username,
        device_name,
        taskInfo,
        tasks,
        setTasks,
        setTaskbox_expanded,
        callback
      );
    }
    return 'connection_closed';
  };

  // Error event: When an error occurs with the WebSocket connection
  socket.onerror = function (error: any) {
    console.error('WebSocket error:', error);
    return 'connection_error';
  };
}

// Add cleanup function to prevent memory leaks
export function cleanupWebSocket() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  reconnectAttempt = 0;
}

// Function to send a download request using the provided socket
export async function download_request(username: string, file_name: string, file_path: string, fileInfo: any, socket: WebSocket, taskInfo: TaskInfo) {
  // Update taskInfo with the file information
  taskInfo.fileInfo = [{
    file_name: fileInfo[0]?.file_name || file_name,
    file_size: fileInfo[0]?.file_size || 0,
    kind: fileInfo[0]?.kind || 'Unknown'
  }];

  console.log("Updated taskInfo:", taskInfo);

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

    socket.send(JSON.stringify(joinMessage));

    // Wait for confirmation that we've joined the room
    const handleJoinConfirmation = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === "transfer_room_joined" && data.transfer_room === transfer_room) {
        socket.removeEventListener('message', handleJoinConfirmation);
        resolve();
      }
    };

    socket.addEventListener('message', handleJoinConfirmation);
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


// Add a map to track total bytes uploaded for each file
const fileUploadProgress = new Map<string, number>();

// Update the handleUploadProgress function
export function handleUploadProgress(chunk: string | Buffer, fileInfo: any) {
  const fileName = fileInfo.file_name;
  const chunkSize = chunk.length;
  const totalSize = fileInfo.file_size || 0;

  // Update the total bytes uploaded for this file
  const currentProgress = fileUploadProgress.get(fileName) || 0;
  const newProgress = currentProgress + chunkSize;
  fileUploadProgress.set(fileName, newProgress);

  // Calculate progress percentage
  const progressPercentage = (newProgress / totalSize) * 100;

  const uploadInfo = {
    filename: fileName,
    fileType: fileInfo.kind || 'Unknown',
    progress: progressPercentage,
    status: progressPercentage >= 100 ? 'completed' as const : 'uploading' as const,
    totalSize: totalSize,
    uploadedSize: newProgress,
    timeRemaining: undefined
  };

  // Update progress through the upload tracking system
  addUploadsInfo([uploadInfo]);

  // Clean up completed uploads
  if (progressPercentage >= 100) {
    fileUploadProgress.delete(fileName);
  }
}

// Usage of the functions
const device_name = os.hostname();
const taskInfo: TaskInfo = {
  task_name: 'download_file',
  task_device: device_name,
  task_status: 'in_progress',
};


export async function connect(
  username: string,
  tasks: any[] | null,
  setTasks: (tasks: any[]) => void,
  setTaskbox_expanded: (expanded: boolean) => void
): Promise<WebSocket> {
  return new Promise((resolve) => {
    createWebSocketConnection(
      username,
      device_name,
      taskInfo,
      tasks || [],
      setTasks,
      setTaskbox_expanded,
      (socket) => {
        resolve(socket);
      }
    );
  });
}
