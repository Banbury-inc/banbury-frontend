import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'

test.describe('Files tests', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    // Get the correct path to the Electron app
    const electronPath = path.join(__dirname, '../../');
    
    // Launch Electron app with increased timeout and debug logging
    electronApp = await electron.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox', electronPath],
      timeout: 180000, // 3 minutes timeout
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: 'true',
        DEBUG: 'electron*,playwright*',
        DISPLAY: process.env.DISPLAY || ':99.0'
      }
    });

    // Wait for the first BrowserWindow to open with increased timeout
    window = await electronApp.firstWindow({ timeout: 60000 });
    
    // Wait for the app to be fully loaded
    await window.waitForLoadState('domcontentloaded', { timeout: 60000 });

    // Check if we're already logged in
    const isLoggedIn = await window.evaluate(() => {
      return !!localStorage.getItem('authToken');
    });

    if (!isLoggedIn) {
      // Handle login
      await window.waitForSelector('input[name="email"]');
      await window.fill('input[name="email"]', 'mmills');
      await window.fill('input[name="password"]', 'dirtballer');
      
      // Click login and wait for response
      await Promise.all([
        window.click('button[type="submit"]'),
        window.waitForResponse(response => response.url().includes('/authentication/getuserinfo4')),
      ]);

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
  });

  test('upload progress button is clickable and opens popover', async () => {
    // Take a screenshot before trying to find the button (for debugging)
    await window.screenshot({ path: 'before-upload-click.png' });

    // Find and click the upload progress button using the test ID
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
    
    // Click the button and wait for the popover to appear
    await uploadButton.click();

    // Log all popovers for debugging
    const allPopovers = window.locator('div[role="presentation"].MuiPopover-root');
    const popoverCount = await allPopovers.count();
    console.log(`Found ${popoverCount} popovers`);
    for (let i = 0; i < popoverCount; i++) {
      const html = await allPopovers.nth(i).evaluate(el => el.outerHTML);
      console.log(`Popover ${i + 1} HTML:`, html);
    }

    // Use a more specific selector for the upload popover
    const uploadPopover = window.locator('div[role="presentation"].MuiPopover-root').filter({
      has: window.getByRole('heading', { name: 'Uploads' })
    });

    // Wait for the specific upload popover to be visible
    await expect(uploadPopover).toBeVisible({ timeout: 10000 });
    
    // Take a screenshot after clicking (for debugging)
    await window.screenshot({ path: 'after-upload-click.png' });
    
    // Verify popover content within the specific upload popover
    const popoverTitle = uploadPopover.getByRole('heading', { name: 'Uploads' });
    await expect(popoverTitle).toBeVisible({ timeout: 10000 });
    
    // Verify tabs are present within the specific upload popover
    const tabs = uploadPopover.getByRole('button').filter({ hasText: /All uploads|Completed|Skipped|Failed/ });
    await expect(tabs).toHaveCount(4, { timeout: 10000 });

    // Log final state for debugging
    console.log('Test completed successfully');
  });

  test('notifications button is clickable and opens popover', async () => {
    // Take a screenshot before clicking
    await window.screenshot({ path: 'before-notifications-click.png' });

    // Find and click the notifications button
    const notificationsButton = window.locator('[data-testid="notifications-button"]');
    await expect(notificationsButton).toBeVisible({ timeout: 10000 });
    await expect(notificationsButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button
    await notificationsButton.click();

    // Log all popovers for debugging
    const allPopovers = window.locator('div[role="presentation"].MuiPopover-root');
    const popoverCount = await allPopovers.count();
    console.log(`Found ${popoverCount} popovers after clicking notifications button`);
    for (let i = 0; i < popoverCount; i++) {
      const html = await allPopovers.nth(i).evaluate(el => el.outerHTML);
      console.log(`Popover ${i + 1} HTML:`, html);
    }

    // Use a more specific selector for the notifications popover
    const notificationsPopover = window.locator('div[role="presentation"].MuiPopover-root').filter({
      has: window.getByRole('heading', { name: 'Notifications' })
    });

    // Wait for the specific notifications popover to be visible
    await expect(notificationsPopover).toBeVisible({ timeout: 10000 });
    
    // Take a screenshot after clicking
    await window.screenshot({ path: 'after-notifications-click.png' });
    
    // Verify popover content within the specific notifications popover
    const popoverTitle = notificationsPopover.getByRole('heading', { name: 'Notifications' });
    await expect(popoverTitle).toBeVisible({ timeout: 10000 });

    // Verify empty state message when no notifications within the specific popover
    const emptyMessage = notificationsPopover.getByText("You're all caught up!");
    await expect(emptyMessage).toBeVisible({ timeout: 10000 });
    const subMessage = notificationsPopover.getByText("No new notifications");
    await expect(subMessage).toBeVisible({ timeout: 10000 });

    // Log final state for debugging
    console.log('Notifications test completed successfully');
  });

  // Keep your other test definitions here...
  test('navigate back button navigates back', async () => {
    // TODO: Implement test
  });

  test('navigate forward button navigates fordward', async () => {
    // TODO: Implement test
  });

  test('can add and delete tabs', async () => {
    // TODO: Implement test
  });

  test('account button is clickable and opens popover', async () => {
    // TODO: Implement test
  });

  test('share button is clickable and opens popover', async () => {
    // TODO: Implement test
  });

  test('change view button is clickable and opens popover', async () => {
    // TODO: Implement test
  });

  test('change view button can change to grid view', async () => {
    // TODO: Implement test
  });

  test('change view button can change to large grid view', async () => {
    // TODO: Implement test
  });

  test('download button downloads a file', async () => {
    // TODO: Implement test
  });

  test('upload button uploads a file', async () => {
    // TODO: Implement test
  });

  test('delete button deletes a file', async () => {
    // TODO: Implement test
  });
});




