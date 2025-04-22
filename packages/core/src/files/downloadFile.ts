import banbury from "..";
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { addDownloadsInfo } from '../device/add_downloads_info';

export function downloadFile(username: string, files: string[], devices: string[], fileInfo: any, taskInfo: any, websocket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
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

    // Check if we're downloading from our own device
    const localHostname = os.hostname();
    const isLocalDevice = devices.some(device => device === localHostname);

    if (isLocalDevice) {
      // If it's a local device, try to access the file directly
      const fileName = files[0];
      const filePath = fileInfo[0]?.file_path || fileName;
      const fileSize = fileInfo[0]?.file_size || 0;
      const fileType = fileInfo[0]?.kind || 'Unknown';
      
      // Create destination directory if it doesn't exist
      if (!fs.existsSync(CONFIG.download_destination)) {
        try {
          fs.mkdirSync(CONFIG.download_destination, { recursive: true });
        } catch (error) {
          console.error('Error creating download directory:', error);
          reject('Failed to create download directory');
          return;
        }
      }
      
      const destinationPath = path.join(CONFIG.download_destination, path.basename(fileName));
      
      try {
        // Create download progress object for UI tracking
        addDownloadsInfo([{
          filename: fileName,
          fileType: fileType,
          progress: 0,
          status: 'downloading',
          totalSize: fileSize,
          downloadedSize: 0,
        }]);
        
        // For local files, we'll simulate progress updates
        const simulateProgress = () => {
          const progressSteps = [25, 50, 75, 99];
          let stepIndex = 0;
          
          const progressInterval = setInterval(() => {
            if (stepIndex < progressSteps.length) {
              addDownloadsInfo([{
                filename: fileName,
                fileType: fileType,
                progress: progressSteps[stepIndex],
                status: 'downloading',
                totalSize: fileSize,
                downloadedSize: Math.floor((progressSteps[stepIndex] / 100) * fileSize),
              }]);
              stepIndex++;
            } else {
              clearInterval(progressInterval);
            }
          }, 100);
          
          return progressInterval;
        };
        
        const progressInterval = simulateProgress();
        
        // Copy the file locally
        fs.copyFileSync(filePath, destinationPath);
        
        // Clear progress simulation and update to completed
        clearInterval(progressInterval);
        addDownloadsInfo([{
          filename: fileName,
          fileType: fileType,
          progress: 100,
          status: 'completed',
          totalSize: fileSize,
          downloadedSize: fileSize,
        }]);
        
        try {
          banbury.analytics.addFileRequestSuccess();
        } catch (error) {
          console.error('Error adding file request success:', error);
        }
        resolve('success');
        return;
      } catch (error) {
        // Update progress to failed
        addDownloadsInfo([{
          filename: fileName,
          fileType: fileType,
          progress: 0,
          status: 'failed',
          totalSize: fileSize,
          downloadedSize: 0,
        }]);
        
        console.error('Error copying local file:', error);
        reject('Failed to copy local file: ' + (error instanceof Error ? error.message : String(error)));
        return;
      }
    }

    // If it's not a local device, continue with websocket download
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
            // Don't resolve yet, wait for full transaction completion
          }

          if (data.message === 'File transaction complete' && data.file_name === files[0]) {
            try {
              banbury.analytics.addFileRequestSuccess();
            } catch (error) {
              console.error('Error adding file request success:', error);
            }
            cleanup();
            resolve('success');
          }

          // Add handling for download_cancelled message type
          if (data.type === 'download_cancelled' || data.message_type === 'download_cancelled') {
            // Update progress to skipped
            addDownloadsInfo([{
              filename: files[0],
              fileType: fileInfo[0]?.kind || 'Unknown',
              progress: 0,
              status: 'skipped',
              totalSize: fileInfo[0]?.file_size || 0,
              downloadedSize: 0,
            }]);
            cleanup();
            resolve('skipped'); // Resolve with 'skipped' status instead of rejecting
            return;
          }

          // Also handle leave_transfer_room as it may indicate a cancelled download
          if (data.type === 'leave_transfer_room' || data.type === 'left_transfer_room') {
            // Update progress to skipped if we're still downloading
            addDownloadsInfo([{
              filename: files[0],
              fileType: fileInfo[0]?.kind || 'Unknown',
              progress: 0,
              status: 'skipped',
              totalSize: fileInfo[0]?.file_size || 0,
              downloadedSize: 0,
            }]);
            cleanup();
            resolve('skipped');
            return;
          }

          if (['File not found', 'Device offline', 'Permission denied', 'Transfer failed', 'file_transfer_error'].includes(data.message_type || data.message)) {
            console.error('Download error message received:', data);
            // Update progress to failed for remote downloads too
            addDownloadsInfo([{
              filename: files[0],
              fileType: fileInfo[0]?.kind || 'Unknown',
              progress: 0,
              status: 'failed',
              totalSize: fileInfo[0]?.file_size || 0,
              downloadedSize: 0,
            }]);
            cleanup();
            reject(data.message || data.error || 'File transfer failed');
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    };

    websocket.addEventListener('message', messageHandler);

    banbury.device.download_request(username, files[0], files[0], fileInfo, websocket, taskInfo)
      .then(room => {
        currentTransferRoom = room;
      })
      .catch(error => {
        console.error('Error sending download request:', error);
        // Update progress to failed for remote downloads
        addDownloadsInfo([{
          filename: files[0],
          fileType: fileInfo[0]?.kind || 'Unknown',
          progress: 0,
          status: 'failed',
          totalSize: fileInfo[0]?.file_size || 0,
          downloadedSize: 0,
        }]);
        cleanup();
        reject('Failed to send download request');
      });
  });
}

