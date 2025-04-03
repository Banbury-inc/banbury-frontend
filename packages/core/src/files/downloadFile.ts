import banbury from "..";

export function downloadFile(username: string, files: string[], devices: string[], fileInfo: any, taskInfo: any, tasks: any[], setTasks: any, setTaskbox_expanded: any, websocket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate inputs
    if (!username) {
      reject('Username is required');
      return;
    }

    if (!files || files.length === 0) {
      reject('No file selected');
      return;
    }

    if (!devices || devices.length === 0) {
      reject('No device selected');
      return;
    }

    // Validate WebSocket connection
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      reject('WebSocket connection is not open');
      return;
    }

    try {
      banbury.analytics.addFileRequest();
    } catch (error) {
      console.error('Analytics error:', error);
      // Don't reject here as analytics is not critical
    }

    const messageHandler = (event: MessageEvent) => {
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
            websocket.removeEventListener('message', messageHandler);
            resolve('success');
          }

          // Check for error conditions
          if (['File not found', 'Device offline', 'Permission denied', 'Transfer failed'].includes(data.message)) {
            websocket.removeEventListener('message', messageHandler);
            reject(data.message);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          websocket.removeEventListener('message', messageHandler);
          reject('Failed to parse server response');
        }
      }
    };

    // Add message handler before sending request
    websocket.addEventListener('message', messageHandler);

    try {
      banbury.device.download_request(username, files[0], files[0], fileInfo, websocket, taskInfo);
    } catch (error) {
      websocket.removeEventListener('message', messageHandler);
      reject('Failed to send download request');
    }
  });
}

