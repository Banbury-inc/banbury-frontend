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

test('download progress button is clickable and opens popover', async () => {
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
    // Always close the app, even if the test fails
    await electronApp.close();
  }
});