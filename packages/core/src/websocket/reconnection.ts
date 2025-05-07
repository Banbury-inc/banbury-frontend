import { RECONNECT_CONFIG } from './connectionCleanup';
import { canAttemptConnection } from './circuitBreaker';
import { TaskInfo } from './files/fileTransfer';
// Add state for reconnection
export let reconnectAttempt = 0;
export let reconnectTimeout: NodeJS.Timeout | null = null;

// Add connection stability tracking
export let connectionAttemptTimestamp = 0;

// Update attemptReconnect function
export function attemptReconnect(
  username: string,
  device_name: string,
  taskInfo: TaskInfo,
  tasks: any[],
  setTasks: (tasks: any[]) => void,
  setTaskbox_expanded: (expanded: boolean) => void,
  callback: (socket: WebSocket) => void,
  createWebSocketConnection: Function
) {
  const now = Date.now();
  
  // Prevent reconnection if we've recently attempted
  if (now - connectionAttemptTimestamp < RECONNECT_CONFIG.initialDelay) {
    return;
  }

  if (reconnectAttempt >= RECONNECT_CONFIG.maxAttempts) {
    return;
  }

  // Check circuit breaker
  if (!canAttemptConnection()) {
    return;
  }

  // Calculate delay with reduced jitter
  const baseDelay = Math.min(
    RECONNECT_CONFIG.initialDelay * Math.pow(1.5, reconnectAttempt),
    RECONNECT_CONFIG.maxDelay
  );
  
  const jitter = baseDelay * RECONNECT_CONFIG.jitter * (Math.random() * 2 - 1);
  const delay = Math.max(baseDelay + jitter, RECONNECT_CONFIG.initialDelay);


  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  connectionAttemptTimestamp = now;
  
  reconnectTimeout = setTimeout(() => {
    createWebSocketConnection(
      username,
      device_name,
      taskInfo,
      tasks,
      setTasks,
      setTaskbox_expanded,
      callback
    );
  }, delay);

  reconnectAttempt++;
} 
