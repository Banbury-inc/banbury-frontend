// Add a map to track download speed calculations
const downloadSpeedTracker = new Map<string, {
  lastUpdate: number;
  lastSize: number;
  speedSamples: number[];
  lastTimeRemaining?: number;
}>();

export function calculateTimeRemaining(downloadedSize: number, totalSize: number, filename: string): number | undefined {
  if (totalSize <= downloadedSize) {
    return undefined;
  }

  const now = Date.now();
  const tracker = downloadSpeedTracker.get(filename) || {
    lastUpdate: now,
    lastSize: 0,
    speedSamples: [],
    lastTimeRemaining: undefined
  };

  // Calculate current speed (bytes per second)
  const timeDiff = (now - tracker.lastUpdate) / 1000; // Convert to seconds
  const sizeDiff = downloadedSize - tracker.lastSize;

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
    tracker.lastSize = downloadedSize;

    // Calculate remaining time in seconds
    const remainingBytes = totalSize - downloadedSize;
    const timeRemaining = Math.ceil(remainingBytes / averageSpeed);

    // Store the new time remaining
    tracker.lastTimeRemaining = timeRemaining > 0 ? timeRemaining : 1;
    downloadSpeedTracker.set(filename, tracker);

    return tracker.lastTimeRemaining;
  }

  // Update tracker but keep the last known time remaining
  downloadSpeedTracker.set(filename, {
    ...tracker,
    lastUpdate: now,
    lastSize: downloadedSize
  });

  // Return the last known time remaining or a rough estimate
  return tracker.lastTimeRemaining || Math.ceil((totalSize - downloadedSize) / 1000000);
}

// Add cleanup function for downloads
export function cleanupDownloadTracker(filename: string) {
  downloadSpeedTracker.delete(filename);
} 