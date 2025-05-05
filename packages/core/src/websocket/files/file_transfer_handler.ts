import { fileReceiver } from './file_receiver';
import { addDownloadsInfo, getDownloadsInfo, DownloadInfo } from '../../device/add_downloads_info';

type BinaryData = ArrayBuffer | Blob | Buffer;

// Track active transfer rooms
const activeTransferRooms = new Set<string>();

function getDataTypeName(data: BinaryData): string {
  if (data instanceof ArrayBuffer) return 'ArrayBuffer';
  if (data instanceof Blob) return 'Blob';
  if (Buffer.isBuffer(data)) return 'Buffer';
  return 'Unknown';
}

export async function handleFileTransferMessage(event: MessageEvent<BinaryData | string>, socket: WebSocket) {

  try {
    // Handle binary data (file chunks)
    if (event.data instanceof ArrayBuffer || event.data instanceof Blob || Buffer.isBuffer(event.data)) {
      const binaryData = event.data;

      try {
        let chunk: Buffer;
        if (binaryData instanceof Blob) {
          const arrayBuffer = await binaryData.arrayBuffer();
          chunk = Buffer.from(new Uint8Array(arrayBuffer));
        } else if (binaryData instanceof ArrayBuffer) {
          chunk = Buffer.from(new Uint8Array(binaryData));
        } else if (Buffer.isBuffer(binaryData)) {
          chunk = binaryData;
        } else {
          throw new Error(`Unsupported data type: ${getDataTypeName(binaryData)}`);
        }

        await fileReceiver.handleFileChunk(chunk);

        // Send chunk acknowledgment
        socket.send(JSON.stringify({
          message_type: 'chunk_received',
          size: chunk.length,
          timestamp: Date.now()
        }));

      } catch (error) {
        socket.send(JSON.stringify({
          message_type: 'file_transfer_error',
          error: error instanceof Error ? error.message : 'Unknown error in file transfer'
        }));
        fileReceiver.cleanup();
      }
      return;
    }

    // Handle JSON messages
    if (typeof event.data === 'string') {
      const data = JSON.parse(event.data);

      // Check for transfer_room first as it's needed by several types
      const transfer_room = data.transfer_room;

      if (data.type === 'download_request_sent') {
        const file_info = data.file_info[0];
        // Pass the transfer_room when starting the receiver
        if (transfer_room) {
          fileReceiver.handleFileStart(file_info, transfer_room);
        } else {
          console.error('[TransferHandler] download_request_sent missing transfer_room');
        }
        return;
      }
      
      switch (data.message_type) {
        case 'transfer_room_joined':
          if (transfer_room) {
            activeTransferRooms.add(transfer_room);
          }
          break;

        case 'file_transfer_start':
        case 'start_file_transfer':
          // Pass transfer_room when starting receiver via this message type too
          if (transfer_room) {
            fileReceiver.handleFileStart(data.file_info, transfer_room);
          } else {
             console.error(`[TransferHandler] ${data.message_type} missing transfer_room`);
          }
          break;

        case 'file_transfer_complete':
          try {
            const savedPath = await fileReceiver.handleFileComplete();
            
            // Find the download for this transfer room and explicitly mark it as completed
            const downloads = getDownloadsInfo();
            const downloadToUpdate = downloads.find((d: DownloadInfo) => d.transfer_room === transfer_room);
            
            if (downloadToUpdate) {
              // Explicitly force the download to completed status with 100% progress
              // This is critical to prevent it being marked as skipped later
              addDownloadsInfo([{ 
                ...downloadToUpdate, 
                status: 'completed',
                progress: 100,
                downloadedSize: downloadToUpdate.totalSize
              }]);
              
              // Verify the status was updated
              const updatedDownloads = getDownloadsInfo();
              updatedDownloads.find((d: DownloadInfo) => d.transfer_room === transfer_room);
            }
            
            // Send completion acknowledgment
            socket.send(JSON.stringify({
              message_type: 'file_transfer_complete_ack',
              status: 'success',
              file_name: data.file_name,
              saved_path: savedPath,
              transfer_room: data.transfer_room
            }));
            
            // Leave the transfer room after a longer delay to ensure status updates are processed
            if (transfer_room && activeTransferRooms.has(transfer_room)) {
              setTimeout(() => {
                activeTransferRooms.delete(transfer_room);
                socket.send(JSON.stringify({
                  message_type: 'leave_transfer_room',
                  transfer_room: data.transfer_room,
                  timestamp: Date.now()
                }));
              }, 3000); // Increased delay to 3 seconds to ensure status updates are processed
            }
          } catch (error) {
            socket.send(JSON.stringify({
              message_type: 'file_transfer_error',
              error: error instanceof Error ? error.message : 'Unknown error in file transfer completion'
            }));
            fileReceiver.cleanup();
          }
          break;

        case 'file_transfer_error':
          if (transfer_room) {
            activeTransferRooms.delete(transfer_room);
          }
          fileReceiver.cleanup();
          break;
      }
    }

  } catch (error: unknown) {
    socket.send(JSON.stringify({
      message_type: 'file_transfer_error',
      error: error instanceof Error ? error.message : 'Unknown error in file transfer handler'
    }));
    fileReceiver.cleanup();
  }
} 
