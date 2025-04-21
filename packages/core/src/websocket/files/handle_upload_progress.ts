import { addUploadsInfo } from '../../device/add_uploads_info';

// Add a map to track total bytes uploaded for each file
const fileUploadProgress = new Map<string, number>();

// Update the handleUploadProgress function
export function handleUploadProgress(chunk: string | Buffer, fileInfo: any) {
  const fileName = fileInfo.file_name;
  const chunkSize = chunk.length;
  const totalSize = fileInfo.file_size || 0;

  // Update the total bytes uploaded for this file
  const currentProgress = fileUploadProgress.get(fileName) || 0;
  const newProgress = currentProgress + chunkSize;
  fileUploadProgress.set(fileName, newProgress);

  // Calculate progress percentage
  const progressPercentage = (newProgress / totalSize) * 100;

  const uploadInfo = {
    filename: fileName,
    fileType: fileInfo.kind || 'Unknown',
    progress: progressPercentage,
    status: progressPercentage >= 100 ? 'completed' as const : 'uploading' as const,
    totalSize: totalSize,
    uploadedSize: newProgress,
    timeRemaining: undefined
  };

  // Update progress through the upload tracking system
  addUploadsInfo([uploadInfo]);

  // Clean up completed uploads
  if (progressPercentage >= 100) {
    fileUploadProgress.delete(fileName);
  }
}
