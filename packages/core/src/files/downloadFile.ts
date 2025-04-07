import banbury from "..";

export function downloadFile(username: string, files: string[], devices: string[], fileInfo: any, taskInfo: any, tasks: any[], setTasks: any, setTaskbox_expanded: any, websocket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
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
    
    // Set up a heartbeat to check for activity
    const heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime;
      
      // If we've received binary data and there's been no activity for 30 seconds, consider it stalled
      if (receivedBinaryData && timeSinceLastActivity > 30000) {
        console.warn('Download appears stalled - no activity for 30 seconds');
        // Don't reject here, just log a warning
      }
    }, 10000); // Check every 10 seconds

    const messageHandler = (event: MessageEvent) => {
      // Update last activity time
      lastActivityTime = Date.now();
      
      // Handle binary data
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        receivedBinaryData = true;
        console.log('Binary data received in downloadFile handler:', 
          event.data instanceof ArrayBuffer ? 
            `ArrayBuffer (${event.data.byteLength} bytes)` : 
            `Blob (${event.data.size} bytes)`);
      }
      
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);

          // Check for success conditions
          if (data.message === 'File transaction complete' && data.file_name === files[0]) {
            try {
              banbury.analytics.addFileRequestSuccess();
            } catch (error) {
              console.error('Error adding file request success:', error);
            }
            clearInterval(heartbeatInterval);
            websocket.removeEventListener('message', messageHandler);
            resolve('success');
          }

          // Check for error conditions
          if (['File not found', 'Device offline', 'Permission denied', 'Transfer failed'].includes(data.message)) {
            clearInterval(heartbeatInterval);
            websocket.removeEventListener('message', messageHandler);
            reject(data.message);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          // Don't reject here, just log the error
        }
      }
    };

    // Add message handler before sending request
    websocket.addEventListener('message', messageHandler);

    try {
      banbury.device.download_request(username, files[0], files[0], fileInfo, websocket, taskInfo);
    } catch (error) {
      clearInterval(heartbeatInterval);
      websocket.removeEventListener('message', messageHandler);
      reject('Failed to send download request');
    }
  });
}

