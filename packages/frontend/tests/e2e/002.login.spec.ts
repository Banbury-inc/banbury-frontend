import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import { getElectronConfig } from './utils/electron-config'
import { createTestUser, loginWithTestUser, completeOnboarding, TestUserCredentials } from './utils/test-user'

test('can login and shows onboarding for first-time user', async () => {
  let electronApp;
  let testUserCredentials: TestUserCredentials;
  
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

    // First create a test account
    testUserCredentials = await createTestUser(window);

    // Type in the username and password
    await window.fill('input[name="email"]', testUserCredentials.username);
    await window.fill('input[name="password"]', testUserCredentials.password);

    // Click on the login button and wait for navigation
    await Promise.all([
      window.click('button[type="submit"]'),
      window.waitForResponse(response => response.url().includes('/authentication/getuserinfo4')),
    ]);

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
