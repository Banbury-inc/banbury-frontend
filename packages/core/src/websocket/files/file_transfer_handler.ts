import { fileReceiver } from './file_receiver';

type BinaryData = ArrayBuffer | Blob | Buffer;

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
      const binaryData = event.data as BinaryData;
      console.log('========================================');
      console.log('📥 CHUNK RECEIVED - Raw Data Info:');
      console.log('----------------------------------------');
      console.log(`   Type: ${getDataTypeName(binaryData)}`);
      
      const dataSize = binaryData instanceof ArrayBuffer ? binaryData.byteLength : 
                      binaryData instanceof Blob ? binaryData.size :
                      Buffer.isBuffer(binaryData) ? binaryData.length : 0;
                      
      console.log(`   Size: ${dataSize} bytes`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
      console.log('========================================');

      try {
        let chunk: Buffer;
        
        if (binaryData instanceof Blob) {
          console.log('🔄 Converting Blob to ArrayBuffer...');
          const arrayBuffer = await binaryData.arrayBuffer();
          chunk = Buffer.from(new Uint8Array(arrayBuffer));
        } else if (binaryData instanceof ArrayBuffer) {
          chunk = Buffer.from(new Uint8Array(binaryData));
        } else if (Buffer.isBuffer(binaryData)) {
          chunk = binaryData;
        } else {
          throw new Error(`Unsupported data type: ${getDataTypeName(binaryData)}`);
        }

        console.log('========================================');
        console.log('📦 PROCESSING CHUNK:');
        console.log('----------------------------------------');
        console.log(`   Chunk size: ${chunk.length} bytes`);
        console.log(`   Is Buffer: ${Buffer.isBuffer(chunk)}`);
        console.log(`   First few bytes:`, chunk.slice(0, 16));
        console.log(`   Time: ${new Date().toISOString()}`);
        console.log('========================================');

        // Ensure we have valid data before proceeding
        if (chunk.length === 0) {
          throw new Error('Received empty chunk');
        }

        await fileReceiver.handleFileChunk(chunk);
        
        // Send chunk acknowledgment
        socket.send(JSON.stringify({
          message_type: 'chunk_received',
          size: chunk.length,
          timestamp: Date.now()
        }));

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
        case 'file_transfer_start':
          console.log('========================================');
          console.log('🚀 FILE TRANSFER STARTING');
          console.log('----------------------------------------');
          console.log('   File name:', data.file_info.file_name);
          console.log('   File size:', data.file_info.file_size, 'bytes');
          console.log('   File type:', data.file_info.kind);
          console.log('   Start time:', new Date().toISOString());
          console.log('========================================');
          
          fileReceiver.handleFileStart(data.file_info);
          socket.send(JSON.stringify({
            message_type: 'file_transfer_start_ack',
            status: 'ready',
            file_name: data.file_info.file_name
          }));
          break;

        case 'file_transfer_complete':
          const savedPath = fileReceiver.handleFileComplete();
          console.log('========================================');
          console.log('✅ FILE TRANSFER COMPLETED');
          console.log('----------------------------------------');
          console.log('   File name:', data.file_name);
          console.log('   Saved to:', savedPath);
          console.log('   Final size:', (await fileReceiver.getFileSize(savedPath)), 'bytes');
          console.log('   Completion time:', new Date().toISOString());
          console.log('========================================');
          
          socket.send(JSON.stringify({
            message_type: 'file_transfer_complete_ack',
            status: 'success',
            file_name: data.file_name,
            saved_path: savedPath
          }));
          break;

        case 'file_transfer_error':
          console.error('========================================');
          console.error('❌ FILE TRANSFER ERROR');
          console.error('----------------------------------------');
          console.error('   Error:', data.error);
          console.error('   Time:', new Date().toISOString());
          console.error('========================================');
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
