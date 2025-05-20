import fs from 'fs';
import os from 'os';
import path from 'path';
import { getSharedContext } from './utils/test-runner';

/**
 * This global setup function is called before all tests start running.
 * It initializes the shared Electron instance and logs in the test user.
 */
async function globalSetup() {
  // Remove persisted auth files in ~/.banbury
  const banburyDir = path.join(os.homedir(), '.banbury');
  if (fs.existsSync(banburyDir)) {
    for (const file of ['token', 'username', 'api_key']) {
      const filePath = path.join(banburyDir, file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
  // Initialize Electron context
  const sharedContext = getSharedContext();
  await sharedContext.initialize();
}

/**
 * This global teardown function is called after all tests are complete.
 * It cleans up the shared Electron instance.
 */

export default globalSetup; 
