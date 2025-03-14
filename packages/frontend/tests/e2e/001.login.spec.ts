import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'

test('can login and shows onboarding for first-time user', async () => {
  let electronApp;
  try {
    // Get the correct path to the Electron app
    const electronPath = path.resolve(__dirname, '../../');
    
    // Launch Electron app with increased timeout and debug logging
    electronApp = await electron.launch({ 
      args: [electronPath],
      timeout: 180000, // 3 minutes timeout
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DEBUG: 'electron*,playwright*' // Enable debug logging
      }
    });

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

    // Clear localStorage to ensure we're testing first-time login
    await window.evaluate(() => {
      localStorage.clear();
    });

    // Wait for the login form to appear
    await window.waitForSelector('input[name="email"]');

    // Type in the username
    await window.fill('input[name="email"]', 'mmills');

    // Type in the password
    await window.fill('input[name="password"]', 'dirtballer');

    // Add debug logging to see what's happening in the page
    await window.evaluate(() => {
      console.log('Current localStorage:', localStorage);
      console.log('Document body:', document.body.innerHTML);
    });

    // Click on the login button and wait for navigation
    await Promise.all([
      window.click('button[type="submit"]'),
      // Wait for the network request to complete
      window.waitForResponse(response => response.url().includes('/authentication/getuserinfo4')),
    ]);

    // Add more debug logging after login attempt
    await window.evaluate(() => {
      console.log('After login - localStorage:', localStorage);
      console.log('After login - Document body:', document.body.innerHTML);
    });

    // Wait for the welcome text to appear in any heading
    const welcomeHeading = await window.waitForSelector('h4:has-text("Welcome to Banbury")', {
      timeout: 30000,
    });

    // Verify the welcome heading is visible
    const isVisible = await welcomeHeading.isVisible();
    expect(isVisible).toBe(true);

    // Additional verification - check for the first step description
    const description = await window.textContent('p.MuiTypography-body1');
    expect(description).toContain("We're excited to have you here!");
    
  } finally {
    if (electronApp) {
      // Close all windows first
      const windows = await electronApp.windows();
      await Promise.all(windows.map(win => win.close()));
      // Then close the app
      await electronApp.close();
    }
  }
});
