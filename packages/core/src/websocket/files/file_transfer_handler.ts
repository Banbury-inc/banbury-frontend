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
  // Log ALL incoming data regardless of type
  console.log('💾 WEBSOCKET DATA RECEIVED:', {
    dataType: typeof event.data,
    isBinary: typeof event.data !== 'string',
    byteLength: typeof event.data !== 'string' 
      ? (event.data instanceof ArrayBuffer ? event.data.byteLength : 
         event.data instanceof Blob ? event.data.size : 
         Buffer.isBuffer(event.data) ? event.data.length : 'unknown') 
      : event.data.length,
    timestamp: new Date().toISOString()
  });

  console.log('handleFileTransferMessage received event.data. Type:', typeof event.data, 'Constructor:', event.data ? event.data.constructor.name : 'null');
  try {
    // Handle binary data (file chunks)
    if (event.data instanceof ArrayBuffer || event.data instanceof Blob || Buffer.isBuffer(event.data)) {
      console.log('========================================');
      console.log('📥 CHUNK RECEIVED - Raw Data Info:');
      console.log('----------------------------------------');
      const binaryData = event.data;
      let dataSize = 0;
      if (binaryData instanceof ArrayBuffer) {
        dataSize = binaryData.byteLength;
      } else if (binaryData instanceof Blob) {
        dataSize = binaryData.size;
      } else if (Buffer.isBuffer(binaryData)) {
        dataSize = binaryData.length;
      }
      console.log(`   Type: ${getDataTypeName(binaryData)}`);
      console.log(`   Size: ${dataSize} bytes`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
      console.log(`   Active transfer rooms: ${Array.from(activeTransferRooms).join(', ')}`);
      console.log('========================================');

      try {
        let chunk: Buffer;
        if (binaryData instanceof Blob) {
          console.log('🔄 Converting Blob to ArrayBuffer...');
          const arrayBuffer = await binaryData.arrayBuffer();
          chunk = Buffer.from(new Uint8Array(arrayBuffer));
        } else if (binaryData instanceof ArrayBuffer) {
          console.log('🔄 Converting ArrayBuffer to Buffer...');
          chunk = Buffer.from(new Uint8Array(binaryData));
        } else if (Buffer.isBuffer(binaryData)) {
          console.log('✅ Already a Buffer, using directly...');
          chunk = binaryData;
        } else {
          throw new Error(`Unsupported data type: ${getDataTypeName(binaryData)}`);
        }

        console.log(`✅ Successfully processed chunk of ${chunk.length} bytes`);
        await fileReceiver.handleFileChunk(chunk);
        console.log(`✅ handleFileChunk completed for ${chunk.length} bytes`);

        // Send chunk acknowledgment
        socket.send(JSON.stringify({
          message_type: 'chunk_received',
          size: chunk.length,
          timestamp: Date.now()
        }));
        console.log(`✅ Sent chunk acknowledgment for ${chunk.length} bytes`);

      } catch (error) {
        console.error('========================================');
        console.error('❌ CHUNK PROCESSING ERROR');
        console.error('----------------------------------------');
        console.error('   Error:', error instanceof Error ? error.message : 'Unknown error');
        const rawDataSize = binaryData instanceof ArrayBuffer ? binaryData.byteLength : 
                           binaryData instanceof Blob ? binaryData.size :
                           Buffer.isBuffer(binaryData) ? binaryData.length : 'unknown';
        console.error('   Raw data type:', getDataTypeName(binaryData));
        console.error('   Raw data size:', rawDataSize);
        console.error('   Time:', new Date().toISOString());
        console.error('========================================');
        socket.send(JSON.stringify({
          message_type: 'file_transfer_error',
          error: error instanceof Error ? error.message : 'Error processing chunk'
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
          console.log('========================================');
          console.log('🔗 JOINED TRANSFER ROOM:', data.transfer_room);
          console.log('----------------------------------------');
          console.log(`   Time: ${new Date().toISOString()}`);
          console.log('========================================');
          activeTransferRooms.add(data.transfer_room);
          break;

        case 'file_transfer_start':
          console.log('========================================');
          console.log('🚀 FILE TRANSFER STARTING');
          console.log('----------------------------------------');
          console.log('   File name:', data.file_info.file_name);
          console.log('   File size:', data.file_info.file_size, 'bytes');
          console.log('   File type:', data.file_info.kind);
          console.log('   Transfer room:', data.transfer_room);
          console.log('   Start time:', new Date().toISOString());
          console.log('========================================');
          fileReceiver.handleFileStart(data.file_info);
          socket.send(JSON.stringify({
            message_type: 'file_transfer_start_ack',
            status: 'ready',
            file_name: data.file_info.file_name,
            transfer_room: data.transfer_room
          }));
          break;

        case 'file_transfer_complete':
          const savedPath = await fileReceiver.handleFileComplete();
          console.log('========================================');
          console.log('✅ FILE TRANSFER COMPLETED');
          console.log('----------------------------------------');
          console.log('   File name:', data.file_name);
          console.log('   Saved to:', savedPath);
          console.log('   Final size:', (await fileReceiver.getFileSize(savedPath)), 'bytes');
          console.log('   Transfer room:', data.transfer_room);
          console.log('   Completion time:', new Date().toISOString());
          console.log('========================================');
          
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
            console.log('Scheduling to leave transfer room after completion:', data.transfer_room);
            setTimeout(() => {
              console.log('========================================');
              console.log('👋 LEAVING TRANSFER ROOM AFTER COMPLETION:', data.transfer_room);
              console.log('----------------------------------------');
              console.log(`   Time: ${new Date().toISOString()}`);
              console.log('========================================');
              
              activeTransferRooms.delete(data.transfer_room);
              socket.send(JSON.stringify({
                message_type: 'leave_transfer_room',
                transfer_room: data.transfer_room,
                timestamp: Date.now()
              }));
            }, 1000); // Leave room after 1 second
          }
          break;

        case 'leave_transfer_room':
          if (data.transfer_room && activeTransferRooms.has(data.transfer_room)) {
            console.log('========================================');
            console.log('👋 LEAVING TRANSFER ROOM:', data.transfer_room);
            console.log('----------------------------------------');
            console.log(`   Time: ${new Date().toISOString()}`);
            console.log('========================================');
            
            activeTransferRooms.delete(data.transfer_room);
            socket.send(JSON.stringify({
              message_type: 'left_transfer_room',
              transfer_room: data.transfer_room,
              timestamp: Date.now()
            }));
            console.log(`✅ Successfully removed transfer room: ${data.transfer_room} from active rooms`);
            console.log(`   Remaining active rooms: ${Array.from(activeTransferRooms).join(', ')}`);
          } else {
            console.log('⚠️ Attempted to leave unknown transfer room:', data.transfer_room);
          }
          break;

        case 'file_transfer_error':
          console.error('========================================');
          console.error('❌ FILE TRANSFER ERROR');
          console.error('----------------------------------------');
          console.error('   Error:', data.error);
          console.error('   Transfer room:', data.transfer_room);
          console.error('   Time:', new Date().toISOString());
          console.error('========================================');
          if (data.transfer_room) {
            activeTransferRooms.delete(data.transfer_room);
          }
          fileReceiver.cleanup();
          break;
      }
    }

  } catch (error: unknown) {
    console.error('========================================');
    console.error('❌ ERROR IN FILE TRANSFER HANDLER');
    console.error('----------------------------------------');
    console.error('   Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('   Time:', new Date().toISOString());
    console.error('========================================');
    socket.send(JSON.stringify({
      message_type: 'file_transfer_error',
      error: error instanceof Error ? error.message : 'Unknown error in file transfer handler'
    }));
    fileReceiver.cleanup();
  }
} 
