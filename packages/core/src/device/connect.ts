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

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3,        // Reduced from 8 to be more responsive
  resetTimeout: 60000,        // 1 minute cooldown
  halfOpenMaxAttempts: 2      // Reduced from 3 to be more conservative
};

// Update connection management
let activeConnection: WebSocket | null = null;
let connectionLock = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let shutdownInProgress = false;

// Enhanced reconnection configuration
const RECONNECT_CONFIG = {
  initialDelay: 2000,         // Start with 2 seconds
  maxDelay: 30000,           // Max 30 seconds
  maxAttempts: 5,            // Maximum reconnection attempts
  jitter: 0.1,               // 10% jitter
  connectionTimeout: 10000,   // 10 second connection timeout
  stabilityThreshold: 5000,   // Connection must be stable for 5 seconds
  heartbeatInterval: 15000,   // Send heartbeat every 15 seconds
  heartbeatTimeout: 8000,     // Wait 8 seconds for heartbeat response
  lockTimeout: 10000,        // Connection lock timeout
  gracefulShutdownTimeout: 3000 // Wait 3 seconds for graceful shutdown
};

// WebSocket options
const WS_OPTIONS = {
  handshakeTimeout: 15000,     // Reduced to match connection timeout
  headers: {                  
    'User-Agent': 'Banbury-Client',
    'X-Client-Version': '1.0.0',
  },
  // Allow self-signed certificates in dev
  rejectUnauthorized: process.env.NODE_ENV === 'production',
  keepAlive: true,           // Enable keep-alive
  keepAliveInterval: 10000,  // Send keep-alive every 10 seconds
};

// Add connection state tracking
const CONNECTION_STATES = {
  INITIAL: 'initial',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed'
} as const;

type ConnectionState = typeof CONNECTION_STATES[keyof typeof CONNECTION_STATES];

// Circuit breaker state
interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  halfOpenAttempts: number;
}

let circuitState: CircuitState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
  halfOpenAttempts: 0
};

let connectionState: ConnectionState = CONNECTION_STATES.INITIAL;

// Function to update connection state with logging
function updateConnectionState(newState: ConnectionState) {
  const oldState = connectionState;
  connectionState = newState;
  console.log(`Connection state changed: ${oldState} -> ${newState}`, {
    timestamp: new Date().toISOString(),
    attempt: reconnectAttempt,
    circuitOpen: circuitState.isOpen
  });
}

// Update recordFailure to be more selective
function recordFailure(error?: any) {
  const now = Date.now();
  
  // Don't count timeouts as harshly
  if (error?.message?.includes('timeout')) {
    circuitState.failures += 0.5; // Count timeouts as half a failure
  } else {
    circuitState.failures++;
  }
  
  circuitState.lastFailure = now;
  circuitState.halfOpenAttempts++;

  // Check if we should open the circuit
  if (circuitState.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold || 
      circuitState.halfOpenAttempts >= CIRCUIT_BREAKER_CONFIG.halfOpenMaxAttempts) {
    circuitState.isOpen = true;
    updateConnectionState(CONNECTION_STATES.FAILED);
    console.log('Circuit breaker opened due to multiple failures', {
      failures: circuitState.failures,
      halfOpenAttempts: circuitState.halfOpenAttempts
    });
  }
}

// Add state for reconnection
let reconnectAttempt = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let lastConnectTime = 0;
let heartbeatInterval: NodeJS.Timeout | null = null;

// Add connection stability tracking
let lastStableConnection = 0;
let connectionAttemptTimestamp = 0;

// Add heartbeat tracking
let lastHeartbeatResponse = Date.now();
let missedHeartbeats = 0;
const MAX_MISSED_HEARTBEATS = 2;

// Add heartbeat tracking
let lastPongTimestamp = Date.now();

// Function to check if connection is stable
function isConnectionStable(): boolean {
  return Date.now() - lastStableConnection >= RECONNECT_CONFIG.stabilityThreshold;
}

// Function to check if circuit breaker allows connection
function canAttemptConnection(): boolean {
  const now = Date.now();
  
  // If circuit is open, check if we can move to half-open
  if (circuitState.isOpen) {
    if (now - circuitState.lastFailure >= CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      // Move to half-open state
      circuitState.isOpen = false;
      circuitState.halfOpenAttempts = 0;
      console.log('Circuit breaker moving to half-open state');
      return true;
    }
    console.log('Circuit breaker is open, blocking connection attempt');
    return false;
  }

  return true;
}

// Update recordSuccess to track stable connections
function recordSuccess() {
  // Only record success if the connection has been stable
  if (isConnectionStable()) {
    circuitState.failures = 0;
    circuitState.isOpen = false;
    circuitState.halfOpenAttempts = 0;
    lastConnectTime = Date.now();
    reconnectAttempt = 0; // Reset attempt counter for stable connections
    lastStableConnection = Date.now();
  }
}

// Update attemptReconnect function
function attemptReconnect(
  username: string,
  device_name: string,
  taskInfo: any,
  tasks: any[],
  setTasks: (tasks: any[]) => void,
  setTaskbox_expanded: (expanded: boolean) => void,
  callback: (socket: WebSocket) => void
) {
  const now = Date.now();
  
  // Prevent reconnection if we've recently attempted
  if (now - connectionAttemptTimestamp < RECONNECT_CONFIG.initialDelay) {
    console.log('Throttling reconnection attempts');
    return;
  }

  if (reconnectAttempt >= RECONNECT_CONFIG.maxAttempts) {
    console.error('Max reconnection attempts reached, circuit breaker opening');
    circuitState.isOpen = true;
    updateConnectionState(CONNECTION_STATES.FAILED);
    return;
  }

  // Check circuit breaker
  if (!canAttemptConnection()) {
    console.log('Circuit breaker preventing reconnection attempt');
    return;
  }

  // Calculate delay with reduced jitter
  const baseDelay = Math.min(
    RECONNECT_CONFIG.initialDelay * Math.pow(1.5, reconnectAttempt),
    RECONNECT_CONFIG.maxDelay
  );
  
  const jitter = baseDelay * RECONNECT_CONFIG.jitter * (Math.random() * 2 - 1);
  const delay = Math.max(baseDelay + jitter, RECONNECT_CONFIG.initialDelay);

  console.log(`Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempt + 1}/${RECONNECT_CONFIG.maxAttempts})`);

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  connectionAttemptTimestamp = now;
  
  reconnectTimeout = setTimeout(() => {
    console.log(`Initiating reconnection attempt ${reconnectAttempt + 1}`);
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

interface FileSyncRequest {
  message_type: 'file_sync_request';
  download_queue: {
    file_name: string;
    file_path: string;
    file_size: number;
    kind: string;
    device_id: string;
  }[];
}

// Add a queue for pending messages
const messageQueue: Array<{
  type: string;
  data: any;
  socket: WebSocket;
  retries?: number;
}> = [];

const MAX_RETRIES = 3;
let processingMessage = false;

// Process messages from the queue
async function processMessageQueue() {
  if (processingMessage || messageQueue.length === 0) return;
  
  processingMessage = true;
  const { type, data, socket, retries = 0 } = messageQueue[0];
  
  try {
    if (type === 'device_info') {
      const device_info = await getDeviceInfo();
      const message = {
        message: 'device_info_response',
        username: data.username,
        sending_device_name: data.device_name,
        requesting_device_name: data.requesting_device_name,
        device_info: device_info,
      };
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        messageQueue.shift(); // Remove processed message
      } else if (retries < MAX_RETRIES) {
        // Put it back in queue with increased retry count
        messageQueue[0].retries = retries + 1;
        console.log(`Retrying device info request (attempt ${retries + 1}/${MAX_RETRIES})`);
      } else {
        console.error('Failed to send device info after max retries');
        messageQueue.shift();
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
    if (retries < MAX_RETRIES) {
      messageQueue[0].retries = retries + 1;
    } else {
      messageQueue.shift();
    }
  } finally {
    processingMessage = false;
    // Process next message if any
    if (messageQueue.length > 0) {
      setTimeout(processMessageQueue, 100); // Small delay between processing
    }
  }
}

// Function to handle heartbeat
function startHeartbeat(socket: WebSocket) {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  lastHeartbeatResponse = Date.now();
  missedHeartbeats = 0;

  heartbeatInterval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      // Check if we've missed too many heartbeats
      if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
        console.log('Missed too many heartbeats, closing connection');
        socket.close(1000, 'Heartbeat timeout');
        return;
      }

      try {
        socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        missedHeartbeats++;

        // Check last heartbeat response
        const timeSinceLastResponse = Date.now() - lastHeartbeatResponse;
        if (timeSinceLastResponse > RECONNECT_CONFIG.heartbeatTimeout) {
          console.log('Heartbeat timeout, closing connection');
          socket.close(1000, 'Heartbeat timeout');
        }
      } catch (error) {
        console.error('Error sending heartbeat:', error);
        socket.close(1000, 'Heartbeat error');
      }
    }
  }, RECONNECT_CONFIG.heartbeatInterval);
}

// Function to cleanup existing connection with graceful shutdown
async function cleanupExistingConnection(): Promise<void> {
  if (activeConnection) {
    try {
      shutdownInProgress = true;
      console.log('Starting graceful shutdown of existing connection');
      
      // Clear any existing timers
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      // Try graceful shutdown
      if (activeConnection.readyState === WebSocket.OPEN) {
        activeConnection.close(1000, 'New connection requested');
        // Wait for graceful shutdown
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.log('Graceful shutdown timed out');
            resolve();
          }, RECONNECT_CONFIG.gracefulShutdownTimeout);

          activeConnection!.onclose = () => {
            clearTimeout(timeout);
            resolve();
          };
        });
      }
    } catch (e) {
      console.error('Error during connection cleanup:', e);
    } finally {
      activeConnection = null;
      shutdownInProgress = false;
    }
  }
}

// Function to release connection lock with cleanup
async function releaseConnectionLock() {
  if (connectionLock) {
    await cleanupExistingConnection();
    connectionLock = false;
  }
}

// Update createWebSocketConnection
export async function createWebSocketConnection(
  username: string,
  device_name: string,
  taskInfo: TaskInfo,
  tasks: any[],
  setTasks: (tasks: any[]) => void,
  setTaskbox_expanded: (expanded: boolean) => void,
  callback: (socket: WebSocket) => void
): Promise<string> {
  // Prevent multiple simultaneous connection attempts
  if (connectionLock || shutdownInProgress) {
    console.log('Connection attempt already in progress or shutdown in progress');
    return 'locked';
  }

  // Set connection lock
  connectionLock = true;
  const lockTimeout = setTimeout(() => releaseConnectionLock(), RECONNECT_CONFIG.lockTimeout);

  try {
    // Check circuit breaker and connection stability
    if (!canAttemptConnection()) {
      console.log('Circuit breaker is open, preventing connection attempt');
      clearTimeout(lockTimeout);
      await releaseConnectionLock();
      return 'circuit_open';
    }

    // Prevent rapid reconnection attempts
    const now = Date.now();
    if (now - connectionAttemptTimestamp < RECONNECT_CONFIG.initialDelay) {
      console.log('Throttling connection attempt');
      clearTimeout(lockTimeout);
      await releaseConnectionLock();
      return 'throttled';
    }


    connectionAttemptTimestamp = now;
    updateConnectionState(CONNECTION_STATES.CONNECTING);

    const WebSocketClient = typeof window !== 'undefined' ? WebSocket : require('ws');
    
    const url_ws = banbury.config.url_ws;
    const device_id = await get_device_id(username);
    
    if (!device_id || typeof device_id !== 'string') {
      console.error('Invalid device_id received:', device_id);
      clearTimeout(lockTimeout);
      await releaseConnectionLock();
      throw new Error('Failed to get valid device ID');
    }
    
    const cleanDeviceId = encodeURIComponent(String(device_id).replace(/\s+/g, ''));
    const entire_url_ws = `${url_ws}${cleanDeviceId}/`.replace(/([^:]\/)\/+/g, "$1");

    console.log(`Attempting to connect to WebSocket at ${entire_url_ws}`, {
      timestamp: new Date().toISOString(),
      attempt: reconnectAttempt
    });

    const socket = typeof window !== 'undefined' 
      ? new WebSocketClient(entire_url_ws)
      : new WebSocketClient(entire_url_ws, {
          ...WS_OPTIONS,
          handshakeTimeout: RECONNECT_CONFIG.connectionTimeout
        });

    // Store as active connection
    activeConnection = socket;
    
    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        console.error('WebSocket connection timeout');
        socket.close(1006, 'Connection timeout');
        clearTimeout(lockTimeout);
        releaseConnectionLock();
      }
    }, RECONNECT_CONFIG.connectionTimeout);

    // Update socket event handlers with error handling
    socket.onopen = function () {
      try {
        clearTimeout(connectionTimeout);
        clearTimeout(lockTimeout);
        connectionLock = false;
        updateConnectionState(CONNECTION_STATES.CONNECTED);
        
        console.log('WebSocket connection established', {
          timestamp: new Date().toISOString(),
          url: entire_url_ws,
          deviceName: device_name
        });

        const message = {
          message_type: `initiate_live_data_connection`,
          username: username,
          device_name: device_name,
          run_device_info_loop: CONFIG.run_device_info_loop,
          run_device_predictions_loop: CONFIG.run_device_predictions_loop,
          client_info: {
            version: '1.0.0',
            platform: process.platform,
            timestamp: Date.now()
          }
        };

        socket.send(JSON.stringify(message));
        callback(socket);
      } catch (error) {
        console.error('Error in onopen handler:', error);
        recordFailure(error);
      }
    };

    socket.onclose = function (event: CloseEvent) {
      try {
        clearTimeout(connectionTimeout);
        clearTimeout(lockTimeout);
        
        if (activeConnection === socket) {
          activeConnection = null;
        }

        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        const closeInfo = {
          timestamp: new Date().toISOString(),
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
          attempt: reconnectAttempt
        };
        
        console.log('WebSocket connection closed:', closeInfo);

        // Handle different close scenarios
        if (!shutdownInProgress) {
          if (event.code === 1000 || event.code === 1001) {
            // Normal closure - no reconnect
            updateConnectionState(CONNECTION_STATES.INITIAL);
          } else if (event.code === 1006 || event.code === 1015) {
            // Abnormal closure - attempt reconnect with backoff
            updateConnectionState(CONNECTION_STATES.RECONNECTING);
            if (canAttemptConnection()) {
              reconnectTimer = setTimeout(() => {
                attemptReconnect(
                  username,
                  device_name,
                  taskInfo,
                  tasks,
                  setTasks,
                  setTaskbox_expanded,
                  callback
                );
              }, RECONNECT_CONFIG.initialDelay * Math.pow(1.5, reconnectAttempt));
            }
          }
        }
      } catch (error) {
        console.error('Error in onclose handler:', error);
      } finally {
        connectionLock = false;
      }
    };

    socket.onerror = function (error: Event) {
      console.error('WebSocket error:', error);
      recordFailure(error);
    };

    socket.onmessage = async function (event: MessageEvent) {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        // Handle pong messages for heartbeat
        if (data.type === 'pong') {
          lastPongTimestamp = Date.now();
          return;
        }

        if (data.request_type === 'device_info') {
          const device_info = await banbury.device.getDeviceInfo();
          const message = {
            message: `device_info_response`,
            username: username,
            sending_device_name: device_name,
            requesting_device_name: data.requesting_device_name,
            device_info: device_info,
          };
          socket.send(JSON.stringify(message));
        }

        // Handle file sync request
        if (data.message === 'File sync request') {
          const syncRequest = data as FileSyncRequest;
          console.log('Received file sync request:', syncRequest);

          if (!syncRequest.download_queue || !Array.isArray(syncRequest.download_queue)) {
            console.log('There are no files to sync right now')
            return;
          }

          // Process each file in the download queue
          for (const fileInfo of syncRequest.download_queue) {
            try {
              await download_request(
                username,
                fileInfo.file_name,
                fileInfo.file_path,
                [fileInfo],
                socket,
                {
                  task_name: `Sync ${fileInfo.file_name}`,
                  task_device: device_name,
                  task_status: 'pending',
                  fileInfo: [{
                    file_name: fileInfo.file_name,
                    file_size: fileInfo.file_size,
                    kind: fileInfo.kind
                  }]
                }
              );
            } catch (error) {
              handleFileSyncError(error, fileInfo, tasks, setTasks, setTaskbox_expanded);
            }
          }

          // Send sync completion acknowledgment
          try {
            socket.send(JSON.stringify({
              message_type: 'file_sync_complete',
              status: 'success',
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error('Error sending sync completion acknowledgment:', error);
          }
        }

        // Handle other message types...
        // ... existing message handlers ...
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        recordFailure(error);
      }
    };

    return 'connecting';
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    clearTimeout(lockTimeout);
    await releaseConnectionLock();
    recordFailure(error);
    return 'connection_error';
  }
}

// Add cleanup function to prevent memory leaks
export function cleanupWebSocket() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (activeConnection) {
    activeConnection.close(1000, 'Cleanup');
    activeConnection = null;
  }
  reconnectAttempt = 0;
  lastPongTimestamp = Date.now();
  resetAccumulatedData();
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

// Add file sync error handling
export function handleFileSyncError(error: any, fileInfo: any, tasks: any[], setTasks: (tasks: any[]) => void, setTaskbox_expanded: (expanded: boolean) => void) {
  console.error('File sync error:', error);
  
  let errorType: 'save_error' | 'file_not_found' | 'device_offline' | 'permission_denied' | 'transfer_failed' = 'transfer_failed';
  
  if (error.code === 'ENOENT') {
    errorType = 'file_not_found';
  } else if (error.code === 'EACCES') {
    errorType = 'permission_denied';
  } else if (error.message?.includes('offline')) {
    errorType = 'device_offline';
  } else if (error.message?.includes('save')) {
    errorType = 'save_error';
  }

  handleTransferError(
    errorType,
    fileInfo.file_name,
    tasks,
    setTasks,
    setTaskbox_expanded
  );
}
