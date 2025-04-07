import { resetAccumulatedData } from './files/file_chunk_handler';

// Circuit breaker configuration
export const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,        // Increased from 3 to be more lenient
  resetTimeout: 120000,       // Increased to 2 minutes cooldown
  halfOpenMaxAttempts: 3      // Increased from 2 to be more lenient
};

// Enhanced reconnection configuration
export const RECONNECT_CONFIG = {
  initialDelay: 200000,         // Start with 2 seconds
  maxDelay: 30000000,           // Max 30 seconds
  maxAttempts: 5,            // Maximum reconnection attempts
  jitter: 0.1,               // 10% jitter
  connectionTimeout: 1500000,   // Increased to 15 second connection timeout
  stabilityThreshold: 1000000,   // Increased to 10 seconds stability requirement
  heartbeatInterval: 15000,   // Send heartbeat every 15 seconds
  heartbeatTimeout: 20000,     // Increased to 20 seconds for heartbeat response
  lockTimeout: 15000,        // Increased to 15 seconds connection lock timeout
  gracefulShutdownTimeout: 5000 // Increased to 5 seconds for graceful shutdown
};

// WebSocket options
export const WS_OPTIONS = {
  handshakeTimeout: 20000,     // Increased to 20 seconds to match connection timeout
  headers: {                  
    'User-Agent': 'Banbury-Client',
    'X-Client-Version': '1.0.0',
  },
  // Allow self-signed certificates in dev
  rejectUnauthorized: process.env.NODE_ENV === 'production',
  keepAlive: true,           // Enable keep-alive
  keepAliveInterval: 15000,  // Increased to 15 seconds keep-alive interval
};

// Circuit breaker state
export interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  halfOpenAttempts: number;
}

export let circuitState: CircuitState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
  halfOpenAttempts: 0
};

// Function to cleanup existing connection with graceful shutdown
export async function cleanupExistingConnection(activeConnection: WebSocket | null, heartbeatInterval: NodeJS.Timeout | null): Promise<void> {
  if (activeConnection) {
    // Clear any existing timers
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    // Try graceful shutdown
    if (activeConnection.readyState === WebSocket.OPEN) {
      activeConnection.close(1000, 'New connection requested');
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve();
        }, RECONNECT_CONFIG.gracefulShutdownTimeout);

        activeConnection.onclose = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    }
  }
}

// Function to release connection lock with cleanup
export async function releaseConnectionLock(
  connectionLock: boolean, 
  activeConnection: WebSocket | null, 
  heartbeatInterval: NodeJS.Timeout | null
): Promise<boolean> {
  if (connectionLock) {
    await cleanupExistingConnection(activeConnection, heartbeatInterval);
    return false;
  }
  return connectionLock;
}

// Add cleanup function to prevent memory leaks
export function cleanupWebSocket(
  reconnectTimeout: NodeJS.Timeout | null,
  heartbeatInterval: NodeJS.Timeout | null,
  activeConnection: WebSocket | null,
  reconnectAttempt: number
): { reconnectTimeout: NodeJS.Timeout | null, heartbeatInterval: NodeJS.Timeout | null, activeConnection: WebSocket | null, reconnectAttempt: number } {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (activeConnection) {
    activeConnection.close(1000, 'Cleanup');
    activeConnection = null;
  }
  reconnectAttempt = 0;
  resetAccumulatedData();
  
  return { reconnectTimeout, heartbeatInterval, activeConnection, reconnectAttempt };
} 
