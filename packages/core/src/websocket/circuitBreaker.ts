import { circuitState, CIRCUIT_BREAKER_CONFIG } from './connectionCleanup';

// Function to check if circuit breaker allows connection
export function canAttemptConnection(): boolean {
  const now = Date.now();
  
  // If circuit is open, check if we can move to half-open
  if (circuitState.isOpen) {
    if (now - circuitState.lastFailure >= CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      // Move to half-open state
      circuitState.isOpen = false;
      circuitState.halfOpenAttempts = 0;
      return true;
    }
    return false;
  }

  return true;
}

// Update recordFailure to be more selective
export function recordFailure(error?: any) {
  const now = Date.now();
  
  // Don't count timeouts as harshly
  if (error?.message?.includes('timeout')) {
    circuitState.failures += 0.25; // Reduced from 0.5 to 0.25 to be more lenient with timeouts
  } else {
    circuitState.failures++;
  }
  
  circuitState.lastFailure = now;
  circuitState.halfOpenAttempts++;

  // Check if we should open the circuit
  if (circuitState.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold || 
      circuitState.halfOpenAttempts >= CIRCUIT_BREAKER_CONFIG.halfOpenMaxAttempts) {
    circuitState.isOpen = true;
  }
} 
