import { CONFIG } from '../config';
import { getDeviceId } from '../device/getDeviceId';
import banbury from '..';
import { ConnectionManager } from './connectionManager';
import { WS_OPTIONS, RECONNECT_CONFIG } from './connectionCleanup';
import { recordFailure } from './circuitBreaker';
import { download_request, FileSyncRequest} from './files/fileTransfer';
import { handleFileRequest, cancelFileSend } from './files/fileSender';
import { handleFileTransferMessage } from './files/fileTransferHandler';
import { fileReceiver } from './files/fileReceiver';
import { addDownloadsInfo, getDownloadsInfo } from '../device/addDownloadsInfo';
import { handleFileSyncError, handleTransferError } from './errorHandler';

// Update connection management
let activeConnection: WebSocket | null = null;

// Maximum number of connection attempts
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

// Fallback endpoints in case the primary endpoint fails
const FALLBACK_ENDPOINTS = [
  (url: string) => url.replace('wss://', 'ws://'), // Try non-secure WebSocket
  (url: string) => url.replace('www.api.dev.', 'api.dev.'), // Try without www
  (url: string) => url.replace('/ws/consumer/', '/ws/live_data/') // Try different path
];

// Update createWebSocketConnection
export async function createWebSocketConnection(
  username: string,
  device_name: string,
  tasks: any[],
  setTasks: (tasks: any[]) => void,
  callback: (socket: WebSocket) => void
): Promise<string> {
  let retryCount = 0;
  let fallbackIndex = -1; // Start with primary URL
  
  async function attemptConnection(): Promise<string> {
    try {
      const WebSocketClient = typeof window !== 'undefined' ? WebSocket : require('ws');
      
      // Get base URL from config
      let url_ws = banbury.config.url_ws;
      
      // Apply fallback transformations if needed
      if (fallbackIndex >= 0 && fallbackIndex < FALLBACK_ENDPOINTS.length) {
        url_ws = FALLBACK_ENDPOINTS[fallbackIndex](url_ws);
      }
      
      // Initialize connection manager
      const connectionManager = ConnectionManager.getInstance();
      
      const device_id = await getDeviceId();
      
      // Check if device_id result is an error
      if (device_id.result === 'error') {
        console.error('Failed to get device ID:', device_id.message);
        connectionManager.recordConnectionAttempt(false);
        recordFailure(new Error(device_id.message));
        return 'connection_error';
      }
      
      const cleanDeviceId = encodeURIComponent(String(device_id.message).replace(/\s+/g, ''));
      const entire_url_ws = `${url_ws}${cleanDeviceId}/`.replace(/([^:]\/)\/+/g, "$1");

      // Check if we should attempt connection using ConnectionManager
      await connectionManager.shouldAttemptConnection();
      
      // Create socket with error handling
      let socket: WebSocket;
      try {
        // Try with different protocols
        const protocols: string[] = [];
        
        socket = typeof window !== 'undefined' 
          ? new WebSocketClient(entire_url_ws)
          : new WebSocketClient(entire_url_ws, {
              ...WS_OPTIONS,
              handshakeTimeout: RECONNECT_CONFIG.connectionTimeout,
              protocols,
              headers: {
                'User-Agent': 'Banbury-Client/1.0',
                'Origin': banbury.config.url
              }
            });
      } catch (socketError) {
        console.error('Failed to create WebSocket:', socketError);
        connectionManager.recordConnectionAttempt(false);
        recordFailure(socketError);
        return 'connection_error';
      }

      // Configure binary type for browser WebSocket
      if (typeof window !== 'undefined') {
        socket.binaryType = 'arraybuffer';
      }

      // Store as active connection
      activeConnection = socket;

      // Set up a connection timeout
      const connectionTimeoutId = setTimeout(() => {
        console.error('WebSocket connection timeout after 10 seconds');
        if (socket.readyState !== WebSocket.OPEN) {
          socket.close();
        }
      }, 10000);

      socket.onopen = function () {
        try {
          // Clear the connection timeout
          clearTimeout(connectionTimeoutId);
          
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
          // Clear the connection timeout if it's still active
          clearTimeout(connectionTimeoutId);
          
          if (activeConnection === socket) {
            activeConnection = null;
          }

          // Record connection attempt result
          connectionManager.recordConnectionAttempt(event.wasClean);

          // Log more detailed info about the closure
          console.error(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}, Clean: ${event.wasClean}`);

          // Check for specific error codes that indicate server/gateway issues
          if (event.code === 1006 || event.code === 1015) {
            console.error('Abnormal closure or TLS handshake failure - likely a server-side issue');
          }

        } catch (error) {
          return error;
        }
      };

      socket.onerror = function (error: Event) {
        console.error('WebSocket connection error:', error);
        
        // More detailed error logging
        if (error instanceof ErrorEvent) {
          console.error(`WebSocket Error: ${error.message}`);
        }
        
        // Check if we're running in a browser environment with a Response object
        if (typeof Response !== 'undefined' && error && (error as any).target && (error as any).target.response instanceof Response) {
          const response = (error as any).target.response;
          console.error(`WebSocket HTTP Error: ${response.status} ${response.statusText}`);
          
          // Special handling for 502 errors
          if (response.status === 502) {
            console.error('Gateway error (502) detected - will try alternative endpoints');
          }
        }
        
        recordFailure(error);
        
        // Attempt to close the socket if error occurs during connection
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      };
      
      socket.onmessage = async function (event: MessageEvent) {
        try {

          // Handle binary data (file chunks)
          if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
            // Pass to file transfer handler
            await handleFileTransferMessage(event, socket);
            return;
          }

          // Handle text messages
          if (typeof event.data === 'string') {
            try {
              const data = JSON.parse(event.data);
              const message_type = data.message_type || data.type; // Handle both patterns
              const transfer_room = data.transfer_room;

              // Handle sender cancellation instruction
              if (message_type === 'cancel_transfer') {
                if (transfer_room) {
                  cancelFileSend(transfer_room);
                } else {
                  console.warn('[WebSocket] cancel_transfer message missing transfer_room');
                }
                return; 
              }

              // Handle sender leaving the transfer room (transfer ended/cancelled/errored)
              if (message_type === 'leave_transfer_room' || message_type === 'left_transfer_room') { // Handle both backend confirmation and sender leaving
                if (transfer_room) {
                  // Stop the receiver from writing more data for this transfer
                  fileReceiver.stopCurrentTransfer();

                  // Find the download for this room
                  const downloads = getDownloadsInfo();
                  const downloadToUpdate = downloads.find(d => d.transfer_room === transfer_room);
                  
                  // CRITICAL: Only mark as skipped if it's currently downloading
                  // and NEVER mark as skipped if it's already completed
                  if (downloadToUpdate && 
                      downloadToUpdate.status === 'downloading' && 
                      downloadToUpdate.progress < 100) {
                    // Only mark as skipped if it's still downloading and not complete
                    addDownloadsInfo([{ ...downloadToUpdate, status: 'skipped' }]);
                  }
                }
                return; // Message handled
              }

              // Handle file transfer related messages
              if (data.message_type && (
                data.message_type.startsWith('file_transfer_') || 
                data.type === 'transfer_room_joined' ||
                data.message_type === 'join_transfer_room' ||
                data.message_type === 'file_transfer_start'
              )) {
                await handleFileTransferMessage(event, socket);
                return;
              }

              // Explicitly handle file_transfer_complete_ack to ensure download is marked as completed
              if (data.message_type === 'file_transfer_complete_ack' && data.status === 'success') {
                const downloads = getDownloadsInfo();
                
                // Try to find download by transfer_room first, then by filename
                let downloadToUpdate = downloads.find(d => d.transfer_room === data.transfer_room);
                if (!downloadToUpdate) {
                  downloadToUpdate = downloads.find(d => d.filename === data.file_name);
                }
                
                if (downloadToUpdate) {
                  // Explicitly mark as completed with 100% progress - this ensures the UI shows the correct status
                  
                  const completedDownload = { 
                    ...downloadToUpdate, 
                    status: 'completed' as const,  // Force correct type
                    progress: 100,
                    downloadedSize: downloadToUpdate.totalSize 
                  };
                  
                  // Update the download info
                  addDownloadsInfo([completedDownload]);
                }
                
                return;
              }

              if (data.type === 'download_request_sent') {
                await handleFileTransferMessage(event, socket);
                return;
              }

              // Handle file requests
              if (data.request_type === 'file_request') {
                await handleFileRequest(data, socket, tasks, setTasks);
                return;
              }

              // Handle chunk received acknowledgments
              if (data.message_type === 'chunk_received') {
                return;
              }

              // Handle file sync requests
              if (data.message === 'File sync request') {
                const syncRequest = data as FileSyncRequest;

                if (!syncRequest.download_queue || !Array.isArray(syncRequest.download_queue)) {
                  console.error('❌ Invalid download queue in sync request');
                  return;
                }

                // Process each file in the download queue
                for (const fileInfo of syncRequest.download_queue) {
                  try {
                    await download_request(
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
                    handleFileSyncError(error, fileInfo, tasks, setTasks);
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
                  );
                }
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
      console.error(`Connection attempt ${retryCount + 1} failed:`, error);
      recordFailure(error);
      return 'connection_error';
    }
  }

  // Implement retry logic with fallbacks
  while (retryCount < MAX_RETRY_ATTEMPTS) {
    const result = await attemptConnection();
    if (result !== 'connection_error') {
      return result;
    }
    
    // Try next fallback if available, otherwise increment retry count
    fallbackIndex++;
    if (fallbackIndex >= FALLBACK_ENDPOINTS.length) {
      fallbackIndex = -1; // Reset to primary URL
      retryCount++;
    }
    
    if (retryCount < MAX_RETRY_ATTEMPTS || fallbackIndex >= 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  console.error(`Failed to establish WebSocket connection after ${MAX_RETRY_ATTEMPTS} attempts with ${FALLBACK_ENDPOINTS.length + 1} endpoints`);
  return 'connection_error';
}


export async function connect(
  username: string,
  device_name: string,
  tasks: string[] | null,
  setTasks: (tasks: any[]) => void,
): Promise<WebSocket> {
  return new Promise((resolve) => {
    createWebSocketConnection(
      username,
      device_name,
      tasks || [],
      setTasks,
      (socket: any) => {
        resolve(socket);
      }
    );
  });
} 
