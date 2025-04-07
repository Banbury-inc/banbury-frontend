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

  public async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
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
      console.log('========================================');
      console.log('📥 FILE CHUNK RECEIVED:');
      console.log('----------------------------------------');
      console.log(`   File: ${this.fileInfo.file_name}`);
      console.log(`   Chunk size: ${chunk.length} bytes`);
      console.log(`   Total received: ${this.receivedBytes + chunk.length} / ${this.fileInfo.file_size} bytes`);
      console.log(`   Progress: ${((this.receivedBytes + chunk.length) / this.fileInfo.file_size * 100).toFixed(2)}%`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
      console.log('========================================');
      
      // Write chunk to file
      console.log('📝 Writing chunk to file stream...');
      this.fileStream.write(chunk);
      this.receivedBytes += chunk.length;
      console.log(`✅ Chunk written successfully. Total bytes received: ${this.receivedBytes}`);

      // Create a new ArrayBuffer from the chunk data to ensure it's the right type
      const arrayBuffer = new Uint8Array(chunk).buffer;
      handleReceivedFileChunk(arrayBuffer, {
        filename: this.fileInfo.file_name,
        fileType: this.fileInfo.kind,
        totalSize: this.fileInfo.file_size
      });
      console.log('✅ Progress tracking updated');

      // Update overall download progress
      updateDownloadProgress([this.fileInfo], this.receivedBytes);
      console.log('✅ Download progress updated');

    } catch (error) {
      console.error('Error handling file chunk:', error);
      this.cleanup();
      throw error;
    }
  }

  public async handleFileComplete(): Promise<string> {
    if (!this.fileStream || !this.fileInfo) {
      throw new Error('No active file transfer');
    }

    // Store non-null variables locally
    const fileStream = this.fileStream;
    const fileInfo = this.fileInfo;

    try {
      await new Promise<void>((resolve, reject) => {
        fileStream.end();
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });

      const finalPath = path.join(this.downloadPath, fileInfo.file_name);

      // Verify file size
      const stats = fs.statSync(finalPath);
      if (stats.size !== fileInfo.file_size) {
        throw new Error('File size mismatch');
      }

      console.log('File download complete:', {
        fileName: fileInfo.file_name,
        savedTo: finalPath,
        size: stats.size,
        finalPath: finalPath
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
