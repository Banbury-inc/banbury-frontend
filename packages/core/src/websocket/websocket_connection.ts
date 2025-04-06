import os from 'os';
import { CONFIG } from '../config';
import { get_device_id } from '../device/get_device_id';
import banbury from '..';
import { ConnectionManager } from './connection_manager';
import { WS_OPTIONS, RECONNECT_CONFIG, cleanupExistingConnection, releaseConnectionLock } from './connection_cleanup';
import { canAttemptConnection, recordFailure } from './circuit_breaker';
import { attemptReconnect, reconnectAttempt, reconnectTimeout } from './reconnection';
import { download_request, handleFileSyncError, TaskInfo, FileSyncRequest, handleTransferError } from './file_transfer';

// Update connection management
let activeConnection: WebSocket | null = null;
let connectionLock = false;
let shutdownInProgress = false;
let connectionAttemptTimestamp = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

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
  const lockTimeout = setTimeout(() => releaseConnectionLock(connectionLock, activeConnection, heartbeatInterval), RECONNECT_CONFIG.lockTimeout);

  try {
    // Check circuit breaker and connection stability
    if (!canAttemptConnection()) {
      clearTimeout(lockTimeout);
      await releaseConnectionLock(connectionLock, activeConnection, heartbeatInterval);
      return 'circuit_open';
    }

    // Prevent rapid reconnection attempts
    const now = Date.now();
    if (now - connectionAttemptTimestamp < RECONNECT_CONFIG.initialDelay) {
      clearTimeout(lockTimeout);
      await releaseConnectionLock(connectionLock, activeConnection, heartbeatInterval);
      return 'throttled';
    }


    connectionAttemptTimestamp = now;

    const WebSocketClient = typeof window !== 'undefined' ? WebSocket : require('ws');
    
    const url_ws = banbury.config.url_ws;
    const device_id = await get_device_id(username);
    
    if (!device_id || typeof device_id !== 'string') {
      clearTimeout(lockTimeout);
      await releaseConnectionLock(connectionLock, activeConnection, heartbeatInterval);
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
        releaseConnectionLock(connectionLock, activeConnection, heartbeatInterval);
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
                  callback,
                  createWebSocketConnection
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
    await releaseConnectionLock(connectionLock, activeConnection, heartbeatInterval);
    recordFailure(error);
    return 'connection_error';
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