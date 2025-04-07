import { CONFIG } from '../config';
import { get_device_id } from '../device/get_device_id';
import banbury from '..';
import { ConnectionManager } from './connection_manager';
import { WS_OPTIONS, RECONNECT_CONFIG } from './connection_cleanup';
import { recordFailure } from './circuit_breaker';
import { download_request, handleFileSyncError, TaskInfo, FileSyncRequest, handleTransferError } from './files/file_transfer';
import { handleFileRequest } from './files/file_sender';
import { handleFileTransferMessage } from './files/file_transfer_handler';

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

    // Configure binary type for browser WebSocket
    if (typeof window !== 'undefined') {
      socket.binaryType = 'arraybuffer';
      console.log('WebSocket binary type set to:', socket.binaryType);
    }

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
        console.log('event: ', event);
        // Handle binary data (file chunks)
        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          console.log('========================================');
          console.log('📦 BINARY DATA RECEIVED');
          console.log('----------------------------------------');
          console.log(`   Size: ${event.data instanceof ArrayBuffer ? event.data.byteLength : event.data.size} bytes`);
          console.log(`   Type: ${event.data instanceof ArrayBuffer ? 'ArrayBuffer' : 'Blob'}`);
          console.log(`   Timestamp: ${new Date().toISOString()}`);
          console.log('========================================');

          // Pass to file transfer handler
          await handleFileTransferMessage(event, socket);
          return;
        }

        // Handle text messages
        if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);
            
            // Handle file transfer related messages
            if (data.message_type && (
              data.message_type.startsWith('file_transfer_') || 
              data.type === 'transfer_room_joined' ||
              data.message_type === 'join_transfer_room'
            )) {
              console.log('📨 Received file transfer message:', data.message_type || data.type);
              await handleFileTransferMessage(event, socket);
              return;
            }

            // Handle file requests
            if (data.request_type === 'file_request') {
              console.log('🔄 File request received:', data);
              await handleFileRequest(data, socket, tasks, setTasks, setTaskbox_expanded);
              return;
            }

            // Handle transfer room joined confirmation
            if (data.type === 'transfer_room_joined') {
              console.log('🔗 Joined transfer room:', data.transfer_room);
              return;
            }

            // Handle left transfer room confirmation
            if (data.type === 'left_transfer_room') {
              console.log('👋 LEFT TRANSFER ROOM:', data.transfer_room);
              console.log('----------------------------------------');
              console.log(`   Time: ${new Date().toISOString()}`);
              console.log('----------------------------------------');
              return;
            }

            // Handle chunk received acknowledgments
            if (data.message_type === 'chunk_received') {
              console.log('✓ Chunk received acknowledgment:', data.size, 'bytes');
              return;
            }

            // Handle file sync requests
            if (data.message === 'File sync request') {
              const syncRequest = data as FileSyncRequest;

              if (!syncRequest.download_queue || !Array.isArray(syncRequest.download_queue)) {
                console.error('❌ Invalid download queue in sync request');
                return;
              }

              console.log('🔄 Processing file sync request with queue:', syncRequest.download_queue);

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

              socket.send(JSON.stringify({
                message_type: 'file_sync_complete',
                status: 'success',
                timestamp: Date.now()
              }));
            }

            // Handle file sent successfully messages
            if (data.type === "file_sent_successfully" || data.message === "File sent successfully") {
              try {
                console.log('✅ File sent successfully:', data.file_name);
                
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
                console.error('❌ Error handling file completion:', error);
                handleTransferError(
                  'save_error',
                  data.file_name,
                  tasks,
                  setTasks,
                  setTaskbox_expanded
                );
              }
            }
          if (data.type === "file_transfer_complete") {
            console.log('✅ File transfer completed:', data.file_name);
          }

          } catch (error) {
            console.error('❌ Error processing message:', error);
            recordFailure(error);
          }
        }
      } catch (error) {
        console.error('❌ Error in message handler:', error);
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
