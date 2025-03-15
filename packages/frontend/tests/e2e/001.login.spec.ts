import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import { platform } from 'os'

test('can login and shows onboarding for first-time user', async () => {
  let electronApp;
  try {
    // Get the correct path to the Electron app
    const electronPath = path.join(__dirname, '../../');
    
    // Platform-specific launch configuration
    const launchConfig: Parameters<typeof electron.launch>[0] = {
      args: ['--no-sandbox', '--disable-setuid-sandbox', electronPath],
      timeout: 180000, // 3 minutes timeout
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: 'true',
        DEBUG: 'electron*,playwright*'
      }
    };

    // Only add DISPLAY env var for Linux
    if (platform() === 'linux') {
      launchConfig.env = {
        ...launchConfig.env,
        DISPLAY: process.env.DISPLAY || ':99.0'
      };
    }
    
    // Launch Electron app with platform-specific config
    electronApp = await electron.launch(launchConfig);

    // Wait for the first BrowserWindow to open with increased timeout
    const window = await electronApp.firstWindow({ timeout: 60000 });
    
    // Ensure the window is loaded
    await window.waitForLoadState('domcontentloaded', { timeout: 60000 });

    // Clear localStorage to ensure we're testing first-time login
    await window.evaluate(() => {
      localStorage.clear();
      console.log('Cleared localStorage');
    });

    // Wait for the login form to appear
    const emailInput = await window.waitForSelector('input[name="email"]', { timeout: 30000 });
    expect(emailInput).toBeTruthy();

    // Type in the username
    await emailInput.fill('mmills');

    // Type in the password
    const passwordInput = await window.waitForSelector('input[name="password"]');
    await passwordInput.fill('dirtballer');

    // Click on the login button and wait for navigation
    const submitButton = await window.waitForSelector('button[type="submit"]');
    await submitButton.click();

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
      await electronApp.close().catch(console.error);
    }
  }
});
