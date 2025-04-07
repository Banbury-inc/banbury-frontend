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
      
      console.log(`📦 Sending chunk: ${chunk.length} bytes`);
      socket.send(chunk);
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
