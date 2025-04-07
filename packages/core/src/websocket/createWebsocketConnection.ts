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

  try {

    const WebSocketClient = typeof window !== 'undefined' ? WebSocket : require('ws');
    
    const url_ws = banbury.config.url_ws;
    const device_id = await get_device_id(username);
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

    socket.onopen = function () {
      try {
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
      console.log('closing websocket')
      try {
        
        if (activeConnection === socket) {
          activeConnection = null;
        }

        // Record connection attempt result
        connectionManager.recordConnectionAttempt(event.wasClean);

      } catch (error) {
        return error;
      }
    };

    socket.onerror = function (error: Event) {
      recordFailure(error);
    };

    socket.onmessage = async function (event: MessageEvent) {
      try {
        const data = JSON.parse(event.data);

        console.log('Received message:', data);

        // Handle pong messages for heartbeat
        if (data.type === 'pong') {
          return;
        }

        if (data.request_type === 'file_request') {
          console.log('File request received:', data);
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
      } catch (error) {
        recordFailure(error);
      }
    };

    return 'connecting';
  } catch (error) {
    recordFailure(error);
    return 'connection_error';
  }
}


export async function connect(
  username: string,
  device_name: string,
  taskInfo: TaskInfo,
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
