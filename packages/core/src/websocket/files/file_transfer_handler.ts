import { fileReceiver } from './file_receiver';

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
      console.log(`Received ${getDataTypeName(binaryData)} data:`, binaryData);

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
      switch (data.message_type) {
        case 'transfer_room_joined':
          activeTransferRooms.add(data.transfer_room);
          
          break;

        case 'file_transfer_start':
          fileReceiver.handleFileStart(data.file_info);
          break;

        case 'file_transfer_complete':
          try {
            const savedPath = await fileReceiver.handleFileComplete();
            // Send completion acknowledgment
            socket.send(JSON.stringify({
              message_type: 'file_transfer_complete_ack',
              status: 'success',
              file_name: data.file_name,
              saved_path: savedPath,
              transfer_room: data.transfer_room
            }));
            // Leave the transfer room after a short delay
            if (data.transfer_room && activeTransferRooms.has(data.transfer_room)) {
              setTimeout(() => {
                activeTransferRooms.delete(data.transfer_room);
                socket.send(JSON.stringify({
                  message_type: 'leave_transfer_room',
                  transfer_room: data.transfer_room,
                  timestamp: Date.now()
                }));
              }, 1000); // Leave room after 1 second
            }
          } catch (error) {
            socket.send(JSON.stringify({
              message_type: 'file_transfer_error',
              error: error instanceof Error ? error.message : 'Unknown error in file transfer completion'
            }));
            fileReceiver.cleanup();
          }
          break;

        case 'leave_transfer_room':
          if (data.transfer_room && activeTransferRooms.has(data.transfer_room)) {
            
            activeTransferRooms.delete(data.transfer_room);
            socket.send(JSON.stringify({
              message_type: 'left_transfer_room',
              transfer_room: data.transfer_room,
              timestamp: Date.now()
            }));
          }
          break;

        case 'file_transfer_error':
          if (data.transfer_room) {
            activeTransferRooms.delete(data.transfer_room);
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
