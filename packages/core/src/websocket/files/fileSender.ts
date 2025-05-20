import * as fs from 'fs';

interface FileRequestData {
  file_path: string;
  file_name: string;
  requesting_device_id: string;
  transfer_room?: string;
}

const CHUNK_SIZE = 1024 * 64; // 64KB chunks

// Map to track active sending operations and allow cancellation
const activeSenders = new Map<string, { shouldCancel: boolean, stream: fs.ReadStream }>();

// Function to signal a sender to cancel
export function cancelFileSend(transfer_room: string): void {
  const senderInfo = activeSenders.get(transfer_room);
  if (senderInfo) {
    senderInfo.shouldCancel = true;
    // The stream will be destroyed and cleaned up in the sending loop
  } else {
    console.warn(`[FileSender] Received cancel signal for unknown/inactive room: ${transfer_room}`);
  }
}

export async function handleFileRequest(
  data: FileRequestData,
  socket: WebSocket,
  tasks: any[],
  setTasks: (tasks: any[]) => void,
): Promise<void> {
  const { file_name, file_path, requesting_device_id, transfer_room } = data;

  if (!transfer_room) {
    console.error('❌ [FileSender] Transfer room missing in file request data:', data);
    // Optionally send an error back to the requester or handle appropriately
    return;
  }

  // Check if this transfer is already active (should ideally not happen)
  if (activeSenders.has(transfer_room)) {
    console.warn(`[FileSender] Transfer already active for room: ${transfer_room}. Ignoring new request.`);
    return;
  }

  let fileStream: fs.ReadStream | null = null;

  try {
    // Join transfer room first
    socket.send(JSON.stringify({
      message_type: 'join_transfer_room',
      transfer_room: transfer_room
    }));

    // Read file
    fileStream = fs.createReadStream(file_path, { highWaterMark: CHUNK_SIZE });
    const fileStats = fs.statSync(file_path);

    // Add to active senders map *before* starting the loop
    activeSenders.set(transfer_room, { shouldCancel: false, stream: fileStream });

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
      const senderInfo = activeSenders.get(transfer_room);

      // Check for cancellation signal before sending chunk
      if (senderInfo?.shouldCancel) {
        // Stream will be destroyed in the finally block
        break; // Exit the loop
      }

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

    // Check if the loop was exited due to cancellation
    const senderInfoAfterLoop = activeSenders.get(transfer_room);
    if (senderInfoAfterLoop?.shouldCancel) {
        // Optionally send a specific cancellation confirmation
        // socket.send(JSON.stringify({ message_type: 'transfer_cancelled_by_sender', transfer_room }));
    } else {
        // Send completion message only if not cancelled
        socket.send(JSON.stringify({
          message_type: 'file_transfer_complete',
          file_name: file_name,
          file_path: file_path,
          requesting_device_id: requesting_device_id,
          transfer_room: transfer_room // Include transfer_room for context
        }));

        // Update task status only if completed successfully
        if (tasks && setTasks) {
          const updatedTasks = tasks.map(task =>
            task.file_name === file_name ? { ...task, status: 'complete' } : task
          );
          setTasks(updatedTasks);
        }
    }

  } catch (error) {
    console.error(`❌ [FileSender] Error during file send for room ${transfer_room}:`, error);
    // Optionally send error message back
    socket.send(JSON.stringify({
      message_type: 'file_transfer_error',
      error: error instanceof Error ? error.message : 'Unknown error during file send',
      file_name: file_name,
      transfer_room: transfer_room
    }));
  } finally {
    // Ensure stream is destroyed and entry is removed from map
    if (fileStream) {
      fileStream.destroy();
    }
    activeSenders.delete(transfer_room);

    // Leave transfer room after completion or cancellation
    // It's important the sender also leaves the room
    socket.send(JSON.stringify({
      message_type: 'leave_transfer_room',
      transfer_room: transfer_room,
      timestamp: Date.now()
    }));
  }
} 
