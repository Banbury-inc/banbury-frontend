import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import { getElectronConfig } from './utils/electron-config'
import { ensureLoggedInAndOnboarded, TestUserCredentials } from './utils/test-user'

test.describe('AI tests', () => {
  let electronApp;
  let window;
  let _testUserCredentials: TestUserCredentials;

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

    // Ensure we have a logged-in user that has completed onboarding
    _testUserCredentials = await ensureLoggedInAndOnboarded(window);

    // Click on the AI tab
    await window.click('[data-testid="sidebar-button-AI"]');

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