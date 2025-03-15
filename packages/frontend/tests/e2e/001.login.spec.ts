import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import { platform } from 'os'
import { getElectronConfig } from './utils/electron-config'

test('can login and shows onboarding for first-time user', async () => {
  let electronApp;
  try {
    // Get the correct path to the Electron app
    const electronPath = path.resolve(__dirname, '../../');
    
    // Launch Electron app with shared configuration
    electronApp = await electron.launch(getElectronConfig(electronPath))
      .catch(async (error) => {
        console.error('Failed to launch electron:', error);
        throw error;
      });

    // Wait for app to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    const isPackaged = await electronApp.evaluate(async ({ app }) => {
      return app.isPackaged;
    });

    expect(isPackaged).toBe(false);

    // Wait for the first BrowserWindow to open
    const window = await electronApp.firstWindow();
    
    // Ensure the window is loaded
    await window.waitForLoadState('domcontentloaded');

    // Clear localStorage to ensure we're testing first-time login
    await window.evaluate(() => {
      localStorage.clear();
    });

    // Wait for the login form to appear
    const emailInput = await window.waitForSelector('input[name="email"]', { timeout: 30000 });
    expect(emailInput).toBeTruthy();

    // Type in the username
    await emailInput.fill('mmills');

    // Type in the password
    const passwordInput = await window.waitForSelector('input[name="password"]');
    await passwordInput.fill('dirtballer');

    // Add debug logging before login
    await window.evaluate(() => {
    });

    // Click on the login button and wait for navigation
    await Promise.all([
      window.click('button[type="submit"]'),
      window.waitForResponse(response => response.url().includes('/authentication/getuserinfo4')),
    ]);

    // Add debug logging after login
    await window.evaluate(() => {
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
    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    if (electronApp) {
      // Close all windows first
      const windows = await electronApp.windows();
      await Promise.all(windows.map(win => win.close()));
      // Then close the app
      await electronApp.close().catch(console.error);
    }
  }
});
