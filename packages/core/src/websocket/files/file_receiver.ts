import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../../config';
import { handleReceivedFileChunk } from './file_chunk_handler';
import { updateDownloadProgress } from './file_transfer';

interface FileInfo {
  file_name: string;
  file_size: number;
  file_path: string;
  kind: string;
}

class FileReceiver {
  private fileStream: fs.WriteStream | null = null;
  private receivedBytes: number = 0;
  private fileInfo: FileInfo | null = null;
  private downloadPath: string;

  constructor() {
    this.downloadPath = CONFIG.download_destination || path.join(process.env.HOME || process.env.USERPROFILE || '', 'Downloads');
    // Ensure download directory exists
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
    }
  }

  public handleFileStart(fileInfo: FileInfo): void {
    this.fileInfo = fileInfo;
    const savePath = path.join(this.downloadPath, fileInfo.file_name);
    
    console.log('Starting file download:', {
      fileName: fileInfo.file_name,
      savePath,
      fileSize: fileInfo.file_size
    });

    try {
      // Create write stream
      this.fileStream = fs.createWriteStream(savePath);
      this.receivedBytes = 0;

      // Handle write stream errors
      this.fileStream.on('error', (error) => {
        console.error('Error writing file:', error);
        this.cleanup();
        throw error;
      });

    } catch (error) {
      console.error('Error creating write stream:', error);
      this.cleanup();
      throw error;
    }
  }

  public handleFileChunk(chunk: Buffer): void {
    if (!this.fileStream || !this.fileInfo) {
      throw new Error('No active file transfer');
    }

    try {
      console.log('Received file chunk:' + chunk.length, 'bytes');
      // Write chunk to file
      this.fileStream.write(chunk);
      this.receivedBytes += chunk.length;

      // Update download progress
      if (this.fileInfo) {
        // Update chunk handler for progress tracking
        handleReceivedFileChunk(chunk, {
          filename: this.fileInfo.file_name,
          fileType: this.fileInfo.kind,
          totalSize: this.fileInfo.file_size
        });

        // Update overall download progress
        updateDownloadProgress([this.fileInfo], this.receivedBytes);
      }

    } catch (error) {
      console.error('Error handling file chunk:', error);
      this.cleanup();
      throw error;
    }
  }

  public handleFileComplete(): string {
    if (!this.fileStream || !this.fileInfo) {
      throw new Error('No active file transfer');
    }

    try {
      // Close the file stream
      this.fileStream.end();
      
      const finalPath = path.join(this.downloadPath, this.fileInfo.file_name);
      
      // Verify file size
      const stats = fs.statSync(finalPath);
      if (stats.size !== this.fileInfo.file_size) {
        throw new Error('File size mismatch');
      }

      console.log('File download complete:', {
        fileName: this.fileInfo.file_name,
        savedTo: finalPath,
        size: stats.size
      });

      this.cleanup();
      return finalPath;

    } catch (error) {
      console.error('Error completing file transfer:', error);
      this.cleanup();
      throw error;
    }
  }

  public cleanup(): void {
    if (this.fileStream) {
      try {
        this.fileStream.end();
      } catch (error) {
        console.error('Error closing file stream:', error);
      }
      this.fileStream = null;
    }
    this.fileInfo = null;
    this.receivedBytes = 0;
  }
}

// Export singleton instance
export const fileReceiver = new FileReceiver(); 
