import { fileReceiver } from './file_receiver';

export async function handleFileTransferMessage(event: MessageEvent, socket: WebSocket) {
  try {
    // Handle binary data (file chunks)
    if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
      const processChunk = async (buffer: ArrayBuffer) => {
        try {
          const chunk = Buffer.from(buffer);
          console.log('----------------------------------------');
          console.log('📦 Received chunk details:');
          console.log(`   Size: ${chunk.length} bytes`);
          console.log(`   Timestamp: ${new Date().toISOString()}`);
          console.log('----------------------------------------');
          
          await fileReceiver.handleFileChunk(chunk);
        } catch (error) {
          console.error('❌ Error processing chunk:', error);
          socket.send(JSON.stringify({
            message_type: 'file_transfer_error',
            error: error instanceof Error ? error.message : 'Error processing chunk'
          }));
        }
      };

      if (event.data instanceof Blob) {
        console.log('🔄 Converting Blob to ArrayBuffer...');
        event.data.arrayBuffer().then(processChunk);
        return;
      } else {
        await processChunk(event.data);
        return;
      }
    }

    // Handle JSON messages
    if (typeof event.data === 'string') {
      const data = JSON.parse(event.data);
      console.log('📨 Received file transfer message type:', data.message_type);

      switch (data.message_type) {
        case 'file_transfer_start':
          console.log('🚀 Starting new file transfer:');
          console.log('----------------------------------------');
          console.log('   File name:', data.file_info.file_name);
          console.log('   File size:', data.file_info.file_size, 'bytes');
          console.log('   File type:', data.file_info.kind);
          console.log('   Start time:', new Date().toISOString());
          console.log('----------------------------------------');
          
          fileReceiver.handleFileStart(data.file_info);
          socket.send(JSON.stringify({
            message_type: 'file_transfer_start_ack',
            status: 'ready',
            file_name: data.file_info.file_name
          }));
          break;

        case 'file_transfer_complete':
          const savedPath = fileReceiver.handleFileComplete();
          console.log('✅ File transfer completed successfully!');
          console.log('----------------------------------------');
          console.log('   File name:', data.file_name);
          console.log('   Saved to:', savedPath);
          console.log('   Completion time:', new Date().toISOString());
          console.log('----------------------------------------');
          
          socket.send(JSON.stringify({
            message_type: 'file_transfer_complete_ack',
            status: 'success',
            file_name: data.file_name,
            saved_path: savedPath
          }));
          break;

        case 'file_transfer_error':
          console.error('❌ Received error from sender:', data.error);
          fileReceiver.cleanup();
          break;
      }
    }

  } catch (error: unknown) {
    console.error('❌ Error in file transfer handler:', error);
    socket.send(JSON.stringify({
      message_type: 'file_transfer_error',
      error: error instanceof Error ? error.message : 'Unknown error in file transfer handler'
    }));
    fileReceiver.cleanup();
  }
} 
