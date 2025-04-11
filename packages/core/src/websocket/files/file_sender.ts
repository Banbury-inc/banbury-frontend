import * as fs from 'fs';

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
): Promise<void> {
  const { file_name, file_path, requesting_device_id, transfer_room } = data;

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
      message_type: 'start_file_transfer',
      file_info: {
        file_name: file_name,
        file_size: fileStats.size,
        file_path: file_path,
        kind: file_name.split('.').pop() || 'unknown'
      }
    }));


    // Send file in chunks
    for await (const chunk of fileStream) {
      // Wait for a small delay to prevent overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Convert Node Buffer to ArrayBuffer
      const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
      
      try {
        // Send binary data
        socket.send(arrayBuffer);
        
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

    // Update task status
    if (tasks && setTasks) {
      const updatedTasks = tasks.map(task =>
        task.file_name === file_name ? { ...task, status: 'complete' } : task
      );
      setTasks(updatedTasks);
    }

    // Leave transfer room after successful completion
    if (transfer_room) {
      setTimeout(() => {
        
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
