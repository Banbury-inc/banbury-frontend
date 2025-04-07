import * as fs from 'fs';
import * as path from 'path';
import { handleTransferError } from './file_transfer';
import { handleUploadProgress } from './handle_upload_progress';
import { TaskInfo } from './file_transfer';

interface FileRequestData {
  file_path: string;
  file_name: string;
  requesting_device_id: string;
  transfer_room?: string;
}

const CHUNK_SIZE = 1024 * 64; // 64KB chunks

export async function handleFileRequest(
  data: FileRequestData,
  socket: WebSocket,
  tasks: any[],
  setTasks: (tasks: any[]) => void,
  setTaskbox_expanded: (expanded: boolean) => void
): Promise<void> {
  const { file_name, file_path, requesting_device_id, transfer_room } = data;
  console.log('🚀 Starting file transfer:', { file_name, file_path, transfer_room });

  try {
    // Join transfer room first
    socket.send(JSON.stringify({
      message_type: 'join_transfer_room',
      transfer_room: transfer_room
    }));

    // Read file
    const fileStream = fs.createReadStream(file_path, { highWaterMark: CHUNK_SIZE });
    const fileStats = fs.statSync(file_path);

    // Send file transfer start message
    socket.send(JSON.stringify({
      message_type: 'file_transfer_start',
      file_info: {
        file_name: file_name,
        file_size: fileStats.size,
        file_path: file_path,
        kind: file_name.split('.').pop() || 'unknown'
      }
    }));

    console.log('📤 Sending file:', {
      name: file_name,
      size: fileStats.size,
      path: file_path
    });

    // Send file in chunks
    for await (const chunk of fileStream) {
      // Wait for a small delay to prevent overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Convert Node Buffer to ArrayBuffer
      const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
      console.log(`📦 Sending chunk: ${arrayBuffer.byteLength} bytes as binary data`);
      
      try {
        // Send binary data
        socket.send(arrayBuffer);
        console.log(`✅ Chunk sent successfully: ${arrayBuffer.byteLength} bytes`);
        
        // Wait for acknowledgment (optional)
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        console.error('❌ Error sending chunk:', error);
        throw error;
      }
    }

    // Send completion message
    socket.send(JSON.stringify({
      message_type: 'file_transfer_complete',
      file_name: file_name,
      file_path: file_path,
      requesting_device_id: requesting_device_id
    }));

    console.log('✅ File transfer completed:', file_name);

    // Update task status
    if (tasks && setTasks) {
      const updatedTasks = tasks.map(task =>
        task.file_name === file_name ? { ...task, status: 'complete' } : task
      );
      setTasks(updatedTasks);
    }

    // Leave transfer room after successful completion
    if (transfer_room) {
      console.log('Scheduling to leave transfer room after sending completion:', transfer_room);
      setTimeout(() => {
        console.log('========================================');
        console.log('👋 LEAVING TRANSFER ROOM AFTER SENDING:', transfer_room);
        console.log('----------------------------------------');
        console.log(`   Time: ${new Date().toISOString()}`);
        console.log('========================================');
        
        socket.send(JSON.stringify({
          message_type: 'leave_transfer_room',
          transfer_room: transfer_room,
          timestamp: Date.now()
        }));
      }, 2000); // Give enough time for completion acknowledgment
    }

  } catch (error) {
    console.error('❌ Error sending file:', error);
    socket.send(JSON.stringify({
      message_type: 'file_transfer_error',
      error: error instanceof Error ? error.message : 'Error sending file',
      file_name: file_name
    }));

    // Update task status to error
    if (tasks && setTasks) {
      const updatedTasks = tasks.map(task =>
        task.file_name === file_name ? { ...task, status: 'error' } : task
      );
      setTasks(updatedTasks);
    }
  }
} 
