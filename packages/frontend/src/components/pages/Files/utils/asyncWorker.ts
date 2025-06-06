/**
 * Utility for running tasks asynchronously without blocking the main thread
 */

// Async queue processor that yields control back to the main thread
export const processAsyncQueue = async <T, R>(
  items: T[],
  processor: (item: T, index: number) => R | Promise<R>,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<R[]> => {
  const { batchSize = 50, delayBetweenBatches = 0, onProgress } = options;
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => processor(item, i + batchIndex))
    );
    
    results.push(...batchResults);
    
    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
    
    // Yield control back to main thread if there are more batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
};

// Debounced async function executor
export const createDebouncedAsync = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let latestPromise: Promise<R> | null = null;

  return (...args: T): Promise<R> => {
    // Cancel existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Create new promise if one doesn't exist or has resolved
    if (!latestPromise) {
      latestPromise = new Promise<R>((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            latestPromise = null;
            timeoutId = null;
          }
        }, delay);
      });
    }

    return latestPromise;
  };
};

// Task scheduler for non-critical operations
export const scheduleTask = <T>(
  task: () => T | Promise<T>,
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<T> => {
  const delays = {
    high: 0,
    normal: 0,
    low: 16 // ~1 frame at 60fps
  };

  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delays[priority]);
  });
};

// Cancellable async operation
export class CancellableOperation<T> {
  private abortController: AbortController;
  private promise: Promise<T>;

  constructor(operation: (signal: AbortSignal) => Promise<T>) {
    this.abortController = new AbortController();
    this.promise = operation(this.abortController.signal);
  }

  cancel(): void {
    this.abortController.abort();
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  async execute(): Promise<T> {
    return this.promise;
  }
}

// Memory-efficient file processing
export const processFilesInChunks = async <T, R>(
  files: T[],
  processor: (file: T) => R | Promise<R>,
  chunkSize: number = 100
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < files.length; i += chunkSize) {
    // Check if we should yield
    if (i > 0) {
      await new Promise(resolve => requestAnimationFrame(() => resolve(void 0)));
    }
    
    const chunk = files.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);
  }
  
  return results;
}; 