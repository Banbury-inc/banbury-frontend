// Connection stabilization configuration
const CONNECTION_CONFIG = {
  RECONNECT_DELAY: 5000,         // 5 seconds between reconnection attempts
  MAX_RECONNECT_ATTEMPTS: 3,     // Maximum number of rapid reconnection attempts
  BACKOFF_MULTIPLIER: 1.5,       // Exponential backoff multiplier
  MAX_BACKOFF_DELAY: 60000,      // Maximum backoff delay (1 minute)
  STABILIZATION_PERIOD: 30000,   // Time window to track connection attempts (30 seconds)
};

// Connection manager to handle connection stability
export class ConnectionManager {
  private static instance: ConnectionManager;
  private connectionAttempts: { timestamp: number; success: boolean }[] = [];
  private lastConnectionTime: number = 0;
  private currentBackoffDelay: number = CONNECTION_CONFIG.RECONNECT_DELAY;

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async shouldAttemptConnection(): Promise<boolean> {
    const now = Date.now();
    
    // Clean up old connection attempts outside the stabilization period
    this.connectionAttempts = this.connectionAttempts.filter(
      attempt => now - attempt.timestamp < CONNECTION_CONFIG.STABILIZATION_PERIOD
    );

    // Count recent connection attempts
    const recentAttempts = this.connectionAttempts.length;
    
    if (recentAttempts >= CONNECTION_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      
      // Calculate and apply exponential backoff
      this.currentBackoffDelay = Math.min(
        this.currentBackoffDelay * CONNECTION_CONFIG.BACKOFF_MULTIPLIER,
        CONNECTION_CONFIG.MAX_BACKOFF_DELAY
      );
      
      await new Promise(resolve => setTimeout(resolve, this.currentBackoffDelay));
      
      // Reset connection attempts after backoff
      this.connectionAttempts = [];
      return true;
    }

    // Check if we're attempting to reconnect too quickly
    const timeSinceLastConnection = now - this.lastConnectionTime;
    if (timeSinceLastConnection < CONNECTION_CONFIG.RECONNECT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, CONNECTION_CONFIG.RECONNECT_DELAY - timeSinceLastConnection));
    }

    return true;
  }

  recordConnectionAttempt(success: boolean) {
    const now = Date.now();
    this.connectionAttempts.push({ timestamp: now, success });
    this.lastConnectionTime = now;

    // Reset backoff delay on successful connection
    if (success) {
      this.currentBackoffDelay = CONNECTION_CONFIG.RECONNECT_DELAY;
      this.connectionAttempts = [];
    }
  }
} 