import * as fs from 'fs';
import * as path from 'path';
import { handleTransferError } from './file_transfer';
import { handleUploadProgress } from './handle_upload_progress';

interface FileRequestData {
  file_path: string;
  file_name: string;
  requesting_device_id: string;
  transfer_room?: string;
}

export async function handleFileRequest(
  data: FileRequestData,
  socket: WebSocket,
  tasks: any[],
  setTasks: (tasks: any[]) => void,
  setTaskbox_expanded: (expanded: boolean) => void
): Promise<void> {
  try {
    const { file_path, file_name, requesting_device_id, transfer_room } = data;

    console.log('sending file:', data);
    
    // Verify the file exists
    if (!fs.existsSync(file_path)) {
      socket.send(JSON.stringify({
        message_type: 'file_error',
        error: 'file_not_found',
        file_name: file_name
      }));
      return;
    }

    // Get file stats for size and type info
    const stats = fs.statSync(file_path);
    const fileInfo = {
      file_name: file_name,
      file_size: stats.size,
      file_path: file_path,
      kind: path.extname(file_name).slice(1) || 'unknown'
    };

    // Join transfer room if specified
    if (transfer_room) {
      socket.send(JSON.stringify({
        message_type: 'join_transfer_room',
        transfer_room: transfer_room
      }));
    }

    // Create read stream
    const fileStream = fs.createReadStream(file_path, {
      highWaterMark: 64 * 1024 // 64KB chunks
    });

    // Send file in chunks
    fileStream.on('data', (chunk: Buffer) => {
      try {
        socket.send(chunk);
        console.log('📦 Sent chunk:', {
          size: chunk.length,
          timestamp: new Date().toISOString()
        });
        handleUploadProgress(chunk, fileInfo);
      } catch (error) {
        fileStream.destroy();
        handleTransferError(
          'transfer_failed',
          file_name,
          tasks,
          setTasks,
          setTaskbox_expanded
        );
      }
    });

    // Handle end of file
    fileStream.on('end', () => {
      socket.send(JSON.stringify({
        message_type: 'file_transfer_complete',
        file_name: file_name,
        file_path: file_path
      }));
    });

    // Handle stream errors
    fileStream.on('error', (error) => {
      handleTransferError(
        'transfer_failed',
        file_name,
        tasks,
        setTasks,
        setTaskbox_expanded
      );
      socket.send(JSON.stringify({
        message_type: 'file_error',
        error: 'transfer_failed',
        file_name: file_name
      }));
    });

  } catch (error) {
    handleTransferError(
      'transfer_failed',
      data.file_name,
      tasks,
      setTasks,
      setTaskbox_expanded
    );
    socket.send(JSON.stringify({
      message_type: 'file_error',
      error: 'transfer_failed',
      file_name: data.file_name
    }));
  }
} 
