import banbury from "..";

export function downloadFile(username: string, files: string[], devices: string[], fileInfo: any, taskInfo: any, tasks: any[], setTasks: any, setTaskbox_expanded: any, websocket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    if (files.length === 0 || devices.length === 0) {
      reject('No file selected');
      return;
    }

    try {
      banbury.analytics.addFileRequest();
    } catch (error) {
      return error;
    }

    // Create timeout ID that we can clear later
    let timeoutId: NodeJS.Timeout;

    const messageHandler = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);

          // Check for success conditions
          if (data.message === 'File transaction complete' && data.file_name === files[0]) {
            clearTimeout(timeoutId); // Clear the timeout
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
            clearTimeout(timeoutId); // Clear the timeout
            websocket.removeEventListener('message', messageHandler);
            reject(data.message);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    };

    // Add the message handler
    websocket.addEventListener('message', messageHandler);

    banbury.device.download_request(username, files[0], files[0], fileInfo, websocket, taskInfo);

    // Store the timeout ID so we can clear it
    timeoutId = setTimeout(() => {
      websocket.removeEventListener('message', messageHandler);
      reject('Download request timed out');
    }, 30000);
  });
}

