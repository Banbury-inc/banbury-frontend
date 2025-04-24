import { getSharedContext } from './utils/test-runner';

/**
 * This global setup function is called before all tests start running.
 * It initializes the shared Electron instance.
 */
async function globalSetup() {
  console.log('Starting global setup for tests...');
  
  // Get the shared context instance and initialize
  const sharedContext = getSharedContext();
  await sharedContext.initialize();
  
  console.log('Global setup complete. Electron app instance is ready.');
}

/**
 * This global teardown function is called after all tests are complete.
 * It cleans up the shared Electron instance.
 */
async function globalTeardown() {
  console.log('Starting global teardown...');
  
  // Get the shared context instance and teardown
  const sharedContext = getSharedContext();
  await sharedContext.teardown();
  
  console.log('Global teardown complete. Electron app instance is closed.');
}

export default globalSetup; 