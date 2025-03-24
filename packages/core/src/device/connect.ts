import os from 'os';
import { CONFIG } from '../config';
import { addDownloadsInfo } from './add_downloads_info';
import { addUploadsInfo } from './add_uploads_info';
import { get_device_id } from './get_device_id';
import banbury from '..';

// Connection stabilization configuration
const CONNECTION_CONFIG = {
  RECONNECT_DELAY: 5000,         // 5 seconds between reconnection attempts
  MAX_RECONNECT_ATTEMPTS: 3,     // Maximum number of rapid reconnection attempts
  BACKOFF_MULTIPLIER: 1.5,       // Exponential backoff multiplier
  MAX_BACKOFF_DELAY: 60000,      // Maximum backoff delay (1 minute)
  STABILIZATION_PERIOD: 30000,   // Time window to track connection attempts (30 seconds)
};

// Connection manager to handle connection stability
class ConnectionManager {
  private static instance: ConnectionManager;
  private connectionAttempts: { timestamp: number; success: boolean }[] = [];
  private lastConnectionTime: number = 0;
  private currentBackoffDelay: number = CONNECTION_CONFIG.RECONNECT_DELAY;

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async shouldAttemptConnection(): Promise<boolean> {
    const now = Date.now();
    
    // Clean up old connection attempts outside the stabilization period
    this.connectionAttempts = this.connectionAttempts.filter(
      attempt => now - attempt.timestamp < CONNECTION_CONFIG.STABILIZATION_PERIOD
    );

    // Count recent connection attempts
    const recentAttempts = this.connectionAttempts.length;
    
    if (recentAttempts >= CONNECTION_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      
      // Calculate and apply exponential backoff
      this.currentBackoffDelay = Math.min(
        this.currentBackoffDelay * CONNECTION_CONFIG.BACKOFF_MULTIPLIER,
        CONNECTION_CONFIG.MAX_BACKOFF_DELAY
      );
      
      await new Promise(resolve => setTimeout(resolve, this.currentBackoffDelay));
      
      // Reset connection attempts after backoff
      this.connectionAttempts = [];
      return true;
    }

    // Check if we're attempting to reconnect too quickly
    const timeSinceLastConnection = now - this.lastConnectionTime;
    if (timeSinceLastConnection < CONNECTION_CONFIG.RECONNECT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, CONNECTION_CONFIG.RECONNECT_DELAY - timeSinceLastConnection));
    }

    return true;
  }

  recordConnectionAttempt(success: boolean) {
    const now = Date.now();
    this.connectionAttempts.push({ timestamp: now, success });
    this.lastConnectionTime = now;

    // Reset backoff delay on successful connection
    if (success) {
      this.currentBackoffDelay = CONNECTION_CONFIG.RECONNECT_DELAY;
      this.connectionAttempts = [];
    }
  }
}

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
    return error;
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

function handleTransferError(
  errorType: 'save_error' | 'file_not_found' | 'device_offline' | 'permission_denied' | 'transfer_failed',
  fileName: string,
  tasks: any[] | null,
  setTasks: ((tasks: any[]) => void) | null,
  setTaskbox_expanded: ((expanded: boolean) => void) | null,
  deviceName?: string
) {
  if (!tasks || !setTasks || !setTaskbox_expanded) {
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


// Function to cleanup existing connection with graceful shutdown
async function cleanupExistingConnection(): Promise<void> {
  if (activeConnection) {
    shutdownInProgress = true;
    
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
          resolve();
        }, RECONNECT_CONFIG.gracefulShutdownTimeout);

        activeConnection!.onclose = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
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
    return 'locked';
  }

  // Set connection lock
  connectionLock = true;
  const lockTimeout = setTimeout(() => releaseConnectionLock(), RECONNECT_CONFIG.lockTimeout);

  try {
    // Check circuit breaker and connection stability
    if (!canAttemptConnection()) {
      clearTimeout(lockTimeout);
      await releaseConnectionLock();
      return 'circuit_open';
    }

    // Prevent rapid reconnection attempts
    const now = Date.now();
    if (now - connectionAttemptTimestamp < RECONNECT_CONFIG.initialDelay) {
      clearTimeout(lockTimeout);
      await releaseConnectionLock();
      return 'throttled';
    }


    connectionAttemptTimestamp = now;

    const WebSocketClient = typeof window !== 'undefined' ? WebSocket : require('ws');
    
    const url_ws = banbury.config.url_ws;
    const device_id = await get_device_id(username);
    
    if (!device_id || typeof device_id !== 'string') {
      clearTimeout(lockTimeout);
      await releaseConnectionLock();
      throw new Error('Failed to get valid device ID');
    }
    
    const cleanDeviceId = encodeURIComponent(String(device_id).replace(/\s+/g, ''));
    const entire_url_ws = `${url_ws}${cleanDeviceId}/`.replace(/([^:]\/)\/+/g, "$1");

    // Check if we should attempt connection using ConnectionManager
    const connectionManager = ConnectionManager.getInstance();
    await connectionManager.shouldAttemptConnection();
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
        socket.close(1006, 'Connection timeout');
        clearTimeout(lockTimeout);
        releaseConnectionLock();
        connectionManager.recordConnectionAttempt(false);
      }
    }, RECONNECT_CONFIG.connectionTimeout);

    // Update socket event handlers with error handling
    socket.onopen = function () {
      try {
        clearTimeout(connectionTimeout);
        clearTimeout(lockTimeout);
        connectionLock = false;
        connectionManager.recordConnectionAttempt(true);

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
        connectionManager.recordConnectionAttempt(false);
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

        // Record connection attempt result
        connectionManager.recordConnectionAttempt(event.wasClean);

        // Handle different close scenarios
        if (!shutdownInProgress) {
          if (event.code === 1000 || event.code === 1001) {
            // Normal closure - no reconnect
          } else if (event.code === 1006 || event.code === 1015) {
            // Abnormal closure - attempt reconnect with backoff
            if (canAttemptConnection()) {
              reconnectTimer = setTimeout(async () => {
                // Check if we should attempt reconnection
                await connectionManager.shouldAttemptConnection();
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
        return error;
      } finally {
        connectionLock = false;
      }
    };

    socket.onerror = function (error: Event) {
      recordFailure(error);
    };

    socket.onmessage = async function (event: MessageEvent) {
      try {
        const data = JSON.parse(event.data);

        // Handle pong messages for heartbeat
        if (data.type === 'pong') {
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

          if (!syncRequest.download_queue || !Array.isArray(syncRequest.download_queue)) {
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
            return error
          }
        } else if (data.type === "file_sent_successfully" || data.message === "File sent successfully") {
          try {

            // Send completion confirmation
            const final_message = {
              message_type: 'file_transaction_complete',
              username: username,
              requesting_device_name: device_name,
              sending_device_name: data.sending_device_name,
              file_name: data.file_name,
              file_path: data.file_path
            };
            socket.send(JSON.stringify(final_message));

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
            handleTransferError(
              'save_error',
              data.file_name,
              tasks,
              setTasks,
              setTaskbox_expanded
            );
            return error;
          }
        }

        // Handle other message types...
        // ... existing message handlers ...
      } catch (error) {
        recordFailure(error);
      }
    };

    return 'connecting';
  } catch (error) {
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
    return;
  }

  if (reconnectAttempt >= RECONNECT_CONFIG.maxAttempts) {
    circuitState.isOpen = true;
    return;
  }

  // Check circuit breaker
  if (!canAttemptConnection()) {
    return;
  }

  // Calculate delay with reduced jitter
  const baseDelay = Math.min(
    RECONNECT_CONFIG.initialDelay * Math.pow(1.5, reconnectAttempt),
    RECONNECT_CONFIG.maxDelay
  );
  
  const jitter = baseDelay * RECONNECT_CONFIG.jitter * (Math.random() * 2 - 1);
  const delay = Math.max(baseDelay + jitter, RECONNECT_CONFIG.initialDelay);


  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  connectionAttemptTimestamp = now;
  
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

// Process messages from the queue


// Function to check if connection is stable

// Function to check if circuit breaker allows connection
function canAttemptConnection(): boolean {
  const now = Date.now();
  
  // If circuit is open, check if we can move to half-open
  if (circuitState.isOpen) {
    if (now - circuitState.lastFailure >= CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      // Move to half-open state
      circuitState.isOpen = false;
      circuitState.halfOpenAttempts = 0;
      return true;
    }
    return false;
  }

  return true;
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
  }
}

// Add state for reconnection
let reconnectAttempt = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

// Add connection stability tracking
let connectionAttemptTimestamp = 0;


