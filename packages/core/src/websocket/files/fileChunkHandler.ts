import { addDownloadsInfo } from '../../device/addDownloadsInfo';
import { calculateTimeRemaining } from '../timeCalculator';

// Add state all file chunks with a reset function
let accumulatedData: Buffer[] = [];

export function resetAccumulatedData() {
  accumulatedData = [];
}

// Function to handle the received file chunk in binary form
export function handleReceivedFileChunk(data: ArrayBuffer, downloadDetails: {
  filename: string | null;
  fileType: string | null;
  totalSize: number;
}) {
  try {
    const chunkBuffer = Buffer.from(data);
    if (chunkBuffer.length > 0) {
      accumulatedData.push(chunkBuffer);

      // Calculate total received bytes
      const totalReceived = accumulatedData.reduce((sum, chunk) => sum + chunk.length, 0);

      // Update download progress
      const downloadInfo = {
        filename: downloadDetails.filename || 'Unknown',
        fileType: downloadDetails.fileType || 'Unknown',
        progress: (totalReceived / downloadDetails.totalSize) * 100,
        status: 'downloading' as const,
        totalSize: downloadDetails.totalSize,
        downloadedSize: totalReceived,
        timeRemaining: calculateTimeRemaining(
          totalReceived,
          downloadDetails.totalSize,
          downloadDetails.filename || 'Unknown'
        )
      };

      addDownloadsInfo([downloadInfo]);
    }
  } catch (error) {
    console.error('Error in handleReceivedFileChunk:', error);
    return error;
  }
} 
