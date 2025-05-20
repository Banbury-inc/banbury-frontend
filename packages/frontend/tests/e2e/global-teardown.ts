import { getSharedContext } from './utils/test-runner';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * This global teardown function is called after all tests are complete.
 * It cleans up the shared Electron instance.
 */
async function globalTeardown() {
  // Remove persisted auth files in ~/.banbury
  const banburyDir = path.join(os.homedir(), '.banbury');
  if (fs.existsSync(banburyDir)) {
    for (const file of ['token', 'username']) {
      const filePath = path.join(banburyDir, file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
  // Get the shared context instance and teardown
  const sharedContext = getSharedContext();
  await sharedContext.teardown();
}

export default globalTeardown; 
