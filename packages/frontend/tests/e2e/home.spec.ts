import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'

test('example test', async () => {
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
    
    await window.screenshot({ path: 'intro.png' });
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

test('download progress button is clickable and opens popover', async () => {
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

    // Wait for the first BrowserWindow to open
    const window = await electronApp.firstWindow();
    
    // Wait for the app to be fully loaded
    await window.waitForLoadState('domcontentloaded');
    await window.waitForLoadState('networkidle');

    // Take a screenshot before trying to find the button (for debugging)
    await window.screenshot({ path: 'before-button-click.png' });

    // Find and click the download progress button using the test ID
    const downloadButton = window.locator('[data-testid="download-progress-button"]');

    // Log the number of matching elements and their HTML for debugging
    const count = await downloadButton.count();
    console.log(`Found ${count} download buttons`);
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const html = await downloadButton.nth(i).evaluate(el => el.outerHTML);
        console.log(`Button ${i + 1} HTML:`, html);
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
    
    // Take a screenshot after clicking (for debugging)
    await window.screenshot({ path: 'after-button-click.png' });
    
    // Verify popover content
    const popoverTitle = popover.getByRole('heading', { name: 'Downloads' });
    await expect(popoverTitle).toBeVisible({ timeout: 10000 });
    
    // Verify tabs are present
    const tabs = popover.getByRole('button').filter({ hasText: /All downloads|Completed|Skipped|Failed/ });
    await expect(tabs).toHaveCount(4, { timeout: 10000 });

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


test(' upload progress button is clickable and opens popover', async () => {
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

    // Wait for the first BrowserWindow to open
    const window = await electronApp.firstWindow();
    
    // Wait for the app to be fully loaded
    await window.waitForLoadState('domcontentloaded');
    await window.waitForLoadState('networkidle');

    // Take a screenshot before trying to find the button (for debugging)
    await window.screenshot({ path: 'before-button-click.png' });

    // Find and click the download progress button using the test ID
    const uploadButton = window.locator('[data-testid="upload-progress-button"]');

    // Log the number of matching elements and their HTML for debugging
    const count = await uploadButton.count();
    console.log(`Found ${count} upload buttons`);
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const html = await uploadButton.nth(i).evaluate(el => el.outerHTML);
        console.log(`Button ${i + 1} HTML:`, html);
      }
    }

    // Wait for the button to be visible and enabled
    await expect(uploadButton).toBeVisible({ timeout: 10000 });
    await expect(uploadButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button
    await uploadButton.click();

    // Verify the popover appears with increased timeout
    const popover = window.locator('div[role="presentation"].MuiPopover-root');
    await expect(popover).toBeVisible({ timeout: 10000 });
    
    // Take a screenshot after clicking (for debugging)
    await window.screenshot({ path: 'after-button-click.png' });
    
    // Verify popover content
    const popoverTitle = popover.getByRole('heading', { name: 'Uploads' });
    await expect(popoverTitle).toBeVisible({ timeout: 10000 });
    
    // Verify tabs are present
    const tabs = popover.getByRole('button').filter({ hasText: /All uploads|Completed|Skipped|Failed/ });
    await expect(tabs).toHaveCount(4, { timeout: 10000 });

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


test('notifications button is clickable and opens popover', async () => {
  let electronApp;
  try {
    const electronPath = path.resolve(__dirname, '../../');
    
    electronApp = await electron.launch({ 
      args: [electronPath],
      timeout: 180000,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DEBUG: 'electron*,playwright*'
      }
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForLoadState('networkidle');

    // Find and click the notifications button
    const notificationsButton = window.locator('[data-testid="notifications-button"]');
    await expect(notificationsButton).toBeVisible({ timeout: 10000 });
    await expect(notificationsButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button
    await notificationsButton.click();

    // Verify the popover appears
    const popover = window.locator('div[role="presentation"].MuiPopover-root');
    await expect(popover).toBeVisible({ timeout: 10000 });
    
    // Verify popover title
    const popoverTitle = popover.getByRole('heading', { name: 'Notifications' });
    await expect(popoverTitle).toBeVisible({ timeout: 10000 });

    // Verify empty state message when no notifications
    const emptyMessage = popover.getByText("You're all caught up!");
    await expect(emptyMessage).toBeVisible({ timeout: 10000 });
    const subMessage = popover.getByText("No new notifications");
    await expect(subMessage).toBeVisible({ timeout: 10000 });

  } finally {
    if (electronApp) {
      const windows = await electronApp.windows();
      await Promise.all(windows.map(win => win.close()));
      await electronApp.close();
    }
  }
});

test('navigate back button navigates back', async () => {
});


test('navigate forward button navigates fordward', async () => {
});


test('can add and delete tabs', async () => {
});


test('account button is clickable and opens popover', async () => {
});

test('share button is clickable and opens popover', async () => {
});



test('change view button is clickable and opens popover', async () => {
});

test('download button downloads a file', async () => {
});


test('upload button uploads a file', async () => {
});


test('delete button deletes a file', async () => {
});




