import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import { getElectronConfig } from './utils/electron-config'

test.describe('AI tests', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    // Get the correct path to the Electron app
    const electronPath = path.resolve(__dirname, '../../');
    
    // Launch Electron app with shared configuration
    electronApp = await electron.launch(getElectronConfig(electronPath));

    const isPackaged = await electronApp.evaluate(async ({ app }) => {
      return app.isPackaged;
    });

    expect(isPackaged).toBe(false);

    // Wait for the first BrowserWindow to open
    window = await electronApp.firstWindow();
    
    // Ensure the window is loaded
    await window.waitForLoadState('domcontentloaded');

    // Check if we're already logged in
    const isLoggedIn = await window.evaluate(() => {
      return !!localStorage.getItem('authToken');
    });

    if (!isLoggedIn) {
      // Handle login
      await window.waitForSelector('input[name="email"]');
      await window.fill('input[name="email"]', 'mmills');
      await window.fill('input[name="password"]', 'dirtballer');
      
      // Add debug logging before login
      await window.evaluate(() => {
      });

      // Click login and wait for response
      await Promise.all([
        window.click('button[type="submit"]'),
        window.waitForResponse(response => response.url().includes('/authentication/getuserinfo4')),
      ]);

      // Add debug logging after login
      await window.evaluate(() => {
      });

      // Check if onboarding is needed
      const needsOnboarding = await window.evaluate(() => {
        return !localStorage.getItem('onboarding_mmills');
      });

      if (needsOnboarding) {
        // Handle onboarding
        await window.waitForSelector('h4:has-text("Welcome to Banbury")', {
          timeout: 30000,
        });

        // Click through onboarding steps
        for (let i = 0; i < 4; i++) {
          // If not the last step, click Next/Skip & Continue
          if (i < 3) {
            const nextButton = await window.waitForSelector('button:has-text("Next"), button:has-text("Skip & Continue")', {
              timeout: 5000
            });
            await nextButton.click();
          } else {
            // On the last step, click Finish
            const finishButton = await window.waitForSelector('button:has-text("Finish")', {
              timeout: 5000
            });
            await finishButton.click();
          }
          // Wait a bit for animations
          await window.waitForTimeout(1000);
        }
      }
      // Click on the Devices tab
      await window.click('[data-testid="sidebar-button-AI"]');
    }

    // Wait for the main interface to load
    await window.waitForSelector('[data-testid="main-component"]', {
      timeout: 30000
    });
  });

  test.beforeEach(async () => {
    // Just ensure we're on the main interface before each test
    await window.waitForSelector('[data-testid="main-component"]', {
      timeout: 30000
    });
  });

  test.afterAll(async () => {
    if (electronApp) {
      const windows = await electronApp.windows();
      await Promise.all(windows.map(win => win.close()));
      await electronApp.close();
    }
  });

  test('download progress button is clickable and opens popover', async () => {

    // Find and click the download progress button using the test ID
    const downloadButton = window.locator('[data-testid="download-progress-button"]');

    // Log the number of matching elements and their HTML for debugging
    const count = await downloadButton.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await downloadButton.nth(i).evaluate(el => el.outerHTML);
      }
    }

    // Wait for the button to be visible and enabled
    await expect(downloadButton).toBeVisible({ timeout: 10000 });
    await expect(downloadButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button
    await downloadButton.click();

    // Verify the popover appears with increased timeout
    const popover = window.locator('div[role="presentation"].MuiPopover-root');
    await expect(popover).toBeVisible({ timeout: 10000 });
    
    // Verify popover content
    const popoverTitle = popover.getByRole('heading', { name: 'Downloads' });
    await expect(popoverTitle).toBeVisible({ timeout: 10000 });
    
    // Verify tabs are present
    const tabs = popover.getByRole('button').filter({ hasText: /All downloads|Completed|Skipped|Failed/ });
    await expect(tabs).toHaveCount(4, { timeout: 10000 });
  });

  test('can generate a prompt', async () => {
  });

  test('can generate a prompt that contains an image', async () => {
  });

  test('can change ai model', async () => {
  });

  test('can delete a chat', async () => {
  });

  test('can edit a chat name', async () => {
  });

  
});