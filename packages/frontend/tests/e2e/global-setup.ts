import { getSharedContext } from './utils/test-runner';

/**
 * This global setup function is called before all tests start running.
 * It initializes the shared Electron instance.
 */
async function globalSetup() {
  
  // Get the shared context instance and initialize
  const sharedContext = getSharedContext();
  await sharedContext.initialize();
}

/**
 * This global teardown function is called after all tests are complete.
 * It cleans up the shared Electron instance.
 */

export default globalSetup; 
