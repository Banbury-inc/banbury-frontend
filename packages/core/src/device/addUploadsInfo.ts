// Add a map to track upload speed calculations
const uploadSpeedTracker = new Map<string, {
  lastUpdate: number;
  lastSize: number;
  speedSamples: number[];
  lastTimeRemaining?: number;
}>();

interface UploadInfo {
  filename: string;
  fileType: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed' | 'skipped';
  totalSize: number;
  uploadedSize: number;
  timeRemaining?: number;
}

let uploadsInfo: UploadInfo[] = [];

export function addUploadsInfo(newUploads: UploadInfo[]): UploadInfo[] {
  newUploads.forEach(newUpload => {
    const existingUploadIndex = uploadsInfo.findIndex(
      upload => upload.filename === newUpload.filename
    );

    // Calculate time remaining
    const timeRemaining = calculateTimeRemaining(newUpload);

    if (existingUploadIndex !== -1) {
      // Update existing upload
      uploadsInfo[existingUploadIndex] = {
        ...uploadsInfo[existingUploadIndex],
        ...newUpload,
        progress: (newUpload.uploadedSize / newUpload.totalSize) * 100,
        timeRemaining
      };
    } else {
      // Add new upload
      uploadsInfo.push({
        ...newUpload,
        progress: (newUpload.uploadedSize / newUpload.totalSize) * 100,
        timeRemaining
      });
    }
  });

  return [...uploadsInfo];
}

function calculateTimeRemaining(upload: UploadInfo): number | undefined {
  if (upload.status !== 'uploading') {
    return undefined;
  }

  const now = Date.now();
  const tracker = uploadSpeedTracker.get(upload.filename) || {
    lastUpdate: now,
    lastSize: 0,
    speedSamples: [],
    lastTimeRemaining: undefined
  };

  // Calculate current speed (bytes per second)
  const timeDiff = (now - tracker.lastUpdate) / 1000; // Convert to seconds
  const sizeDiff = upload.uploadedSize - tracker.lastSize;
  
  if (timeDiff > 0) {
    const currentSpeed = sizeDiff / timeDiff;

    // Keep last 5 speed samples for averaging
    tracker.speedSamples.push(currentSpeed);
    if (tracker.speedSamples.length > 5) {
      tracker.speedSamples.shift();
    }

    // Calculate average speed
    const averageSpeed = tracker.speedSamples.reduce((a, b) => a + b, 0) / tracker.speedSamples.length;

    // Update tracker
    tracker.lastUpdate = now;
    tracker.lastSize = upload.uploadedSize;

    // Calculate remaining time in seconds
    const remainingBytes = upload.totalSize - upload.uploadedSize;
    const timeRemaining = Math.ceil(remainingBytes / averageSpeed);

    // Store the new time remaining
    tracker.lastTimeRemaining = timeRemaining > 0 ? timeRemaining : 1;
    uploadSpeedTracker.set(upload.filename, tracker);

    return tracker.lastTimeRemaining;
  }

  // Update tracker but keep the last known time remaining
  uploadSpeedTracker.set(upload.filename, {
    ...tracker,
    lastUpdate: now,
    lastSize: upload.uploadedSize
  });

  // Return the last known time remaining instead of undefined
  return tracker.lastTimeRemaining || Math.ceil((upload.totalSize - upload.uploadedSize) / 1000000); // Fallback to rough estimate
}

export function getUploadsInfo(): UploadInfo[] {
  return [...uploadsInfo];
}

