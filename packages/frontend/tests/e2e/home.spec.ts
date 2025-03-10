import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'

test('example test', async () => {
  // Get the correct path to the Electron app
  const electronPath = path.resolve(__dirname, '../../');
  
  // Launch Electron app with increased timeout and debug logging
  const electronApp = await electron.launch({ 
    args: [electronPath],
    timeout: 180000, // 3 minutes timeout
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DEBUG: 'electron*,playwright*' // Enable debug logging
    }
  });

  try {
    const isPackaged = await electronApp.evaluate(async ({ app }) => {
      // This runs in Electron's main process, parameter here is always
      // the result of the require('electron') in the main app script.
      return app.isPackaged;
    });

    expect(isPackaged).toBe(false);

    // Wait for the first BrowserWindow to open with increased timeout
    const window = await electronApp.firstWindow();
    
    // Ensure the window is loaded
    await window.waitForLoadState('domcontentloaded');
    
    await window.screenshot({ path: 'intro.png' });
  } finally {
    // Always close the app, even if the test fails
    await electronApp.close();
  }
});