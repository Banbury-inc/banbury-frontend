// Add a map to track download speed calculations
const downloadSpeedTracker = new Map<string, {
  lastUpdate: number;
  lastSize: number;
  speedSamples: number[];
  lastTimeRemaining?: number;
}>();

// Type for download info
export interface DownloadInfo {
  filename: string;
  fileType: string;
  progress: number;
  status: 'downloading' | 'completed' | 'failed' | 'skipped' | 'canceled';
  totalSize: number;
  downloadedSize: number;
  timeRemaining?: number;
  // Add fields needed for cancellation
  sending_device_id?: string;
  transfer_room?: string;
}

// Store for active downloads
let activeDownloads: DownloadInfo[] = [];

// Function to add or update downloads
export function addDownloadsInfo(newDownloads: DownloadInfo[]): DownloadInfo[] {
  newDownloads.forEach(newDownload => {
    if (newDownload.filename === "Unknown") {
      // Find the currently downloading file and update it
      const downloadingIndex = activeDownloads.findIndex(
        download => download.status === 'downloading'
      );

      if (downloadingIndex !== -1) {
        // Calculate time remaining
        const timeRemaining = calculateTimeRemaining({
          ...activeDownloads[downloadingIndex],
          ...newDownload
        });

        // Update the currently downloading file
        activeDownloads[downloadingIndex] = {
          ...activeDownloads[downloadingIndex],
          downloadedSize: newDownload.downloadedSize,
          progress: (newDownload.downloadedSize / activeDownloads[downloadingIndex].totalSize) * 100,
          status: newDownload.progress === 100 ? 'completed' : 'downloading',
          timeRemaining
        };
      }
    } else {
      // Original logic for files with filenames
      const existingDownloadIndex = activeDownloads.findIndex(
        download => download.filename === newDownload.filename
      );

      // Calculate time remaining
      const timeRemaining = calculateTimeRemaining(newDownload);

      if (existingDownloadIndex !== -1) {
        // Log status transitions for debugging
        const currentStatus = activeDownloads[existingDownloadIndex].status;
        const newStatus = newDownload.status;
        
        // Special handling: NEVER downgrade a completed status to skipped
        if (currentStatus === 'completed' && newStatus === 'skipped') {
          // Keep the completed status but apply other updates
          activeDownloads[existingDownloadIndex] = {
            ...activeDownloads[existingDownloadIndex],
            ...newDownload,
            status: 'completed', // Preserve completed status
            progress: 100,       // Ensure progress is 100%
            timeRemaining
          };
          return; // Skip normal update
        }
        
        activeDownloads[existingDownloadIndex] = {
          ...activeDownloads[existingDownloadIndex],
          ...newDownload,
          progress: (newDownload.downloadedSize / newDownload.totalSize) * 100,
          timeRemaining
        };
      } else {
        activeDownloads.push({
          ...newDownload,
          progress: (newDownload.downloadedSize / newDownload.totalSize) * 100,
          timeRemaining
        });
      }
    }
  });

  // Remove completed downloads after a delay
  activeDownloads = activeDownloads.filter(
    download => download.status === 'downloading' ||
      download.status === 'failed' ||
      download.status === 'skipped' ||
      download.status === 'completed'
  );

  return [...activeDownloads];
}

function calculateTimeRemaining(download: DownloadInfo): number | undefined {
  if (download.status !== 'downloading') {
    return undefined;
  }

  const now = Date.now();
  const tracker = downloadSpeedTracker.get(download.filename) || {
    lastUpdate: now,
    lastSize: 0,
    speedSamples: [],
    lastTimeRemaining: undefined
  };

  // Calculate current speed (bytes per second)
  const timeDiff = (now - tracker.lastUpdate) / 1000; // Convert to seconds
  const sizeDiff = download.downloadedSize - tracker.lastSize;

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
    tracker.lastSize = download.downloadedSize;

    // Calculate remaining time in seconds
    const remainingBytes = download.totalSize - download.downloadedSize;
    const timeRemaining = Math.ceil(remainingBytes / averageSpeed);

    // Store the new time remaining
    tracker.lastTimeRemaining = timeRemaining > 0 ? timeRemaining : 1;
    downloadSpeedTracker.set(download.filename, tracker);

    return tracker.lastTimeRemaining;
  }

  // Update tracker but keep the last known time remaining
  downloadSpeedTracker.set(download.filename, {
    ...tracker,
    lastUpdate: now,
    lastSize: download.downloadedSize
  });

  // Return the last known time remaining or a rough estimate
  return tracker.lastTimeRemaining || Math.ceil((download.totalSize - download.downloadedSize) / 1000000);
}

// Function to get current downloads
export function getDownloadsInfo(): DownloadInfo[] {
  return [...activeDownloads];
}

