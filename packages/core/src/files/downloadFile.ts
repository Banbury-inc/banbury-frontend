import banbury from "..";

export function downloadFile(username: string, files: string[], devices: string[], fileInfo: any, taskInfo: any, tasks: any[], setTasks: any, setTaskbox_expanded: any, websocket: WebSocket): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let currentTransferRoom: string | null = null;

    // Validate inputs
    if (!username || !files || files.length === 0) {
      reject('No file selected');
      return;
    }

    if (!devices || devices.length === 0) {
      reject('No device selected');
      return;
    }

    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      reject('WebSocket connection is not open');
      return;
    }

    // Set up a flag to track if we've received any binary data
    let receivedBinaryData = false;
    let lastActivityTime = Date.now();
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      websocket.removeEventListener('message', messageHandler);
      
      // Leave the transfer room if we joined one
      if (currentTransferRoom) {
        console.log('Requesting to leave transfer room:', currentTransferRoom);
        websocket.send(JSON.stringify({
          message_type: 'leave_transfer_room',
          transfer_room: currentTransferRoom
        }));
        currentTransferRoom = null;
      }
    };
    
    // Set up a heartbeat to check for activity
    heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime;
      
      // If we've received binary data and there's been no activity for 30 seconds, consider it stalled
      if (receivedBinaryData && timeSinceLastActivity > 30000) {
        console.warn('Download appears stalled - no activity for 30 seconds');
      }
    }, 10000); // Check every 10 seconds

    const messageHandler = (event: MessageEvent) => {
      lastActivityTime = Date.now();
      
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        receivedBinaryData = true;
      }
      
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);

          if (data.message_type === 'file_transfer_complete_ack' && data.file_name === files[0]) {
            console.log('File transfer complete ack received for:', data.file_name);
            // Don't resolve yet, wait for full transaction completion
          }

          if (data.message === 'File transaction complete' && data.file_name === files[0]) {
            console.log('File transaction complete message received for:', data.file_name);
            try {
              banbury.analytics.addFileRequestSuccess();
            } catch (error) {
              console.error('Error adding file request success:', error);
            }
            cleanup();
            resolve('success');
          }

          if (['File not found', 'Device offline', 'Permission denied', 'Transfer failed', 'file_transfer_error'].includes(data.message_type || data.message)) {
            console.error('Download error message received:', data);
            cleanup();
            reject(data.message || data.error || 'File transfer failed');
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    };

    websocket.addEventListener('message', messageHandler);

    try {
      currentTransferRoom = await banbury.device.download_request(username, files[0], files[0], fileInfo, websocket, taskInfo);
      console.log('Download request sent, transfer room:', currentTransferRoom);
    } catch (error) {
      console.error('Error sending download request:', error);
      cleanup();
      reject('Failed to send download request');
    }
  });
}

