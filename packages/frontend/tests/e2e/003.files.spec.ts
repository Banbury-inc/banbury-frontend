import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import { getElectronConfig } from './utils/electron-config'
import fs from 'fs'
import { waitForWebsocketConnection, TestUserCredentials, ensureLoggedInAndOnboarded, dismissUnexpectedDialogs, wrapWithRecovery } from './utils/test-user'

test.describe('Files tests', () => {
  let electronApp;
  let window;
  let testUserCredentials: TestUserCredentials;

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
    testUserCredentials = await ensureLoggedInAndOnboarded(window);
  });

  test.beforeEach(async () => {
    // Dismiss any unexpected dialogs that might be blocking the UI
    await dismissUnexpectedDialogs(window);
    
    // Verify we're still on the main interface before each test
    // If not, try to log in again
    const isMainVisible = await window.waitForSelector('[data-testid="main-component"]', {
      timeout: 5000,
      state: 'visible'
    }).then(() => true).catch(() => false);
    
    if (!isMainVisible) {
      console.log('Main interface not visible, attempting to log in again...');
      await ensureLoggedInAndOnboarded(window);
    }
    
    // Now we should be on the main interface
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
    
    // Click the button to open
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

    // Click the button again to close
    await downloadButton.click();

    // Verify the popover is hidden
    await expect(popover).not.toBeVisible({ timeout: 10000 });
  });

  test('upload progress button is clickable and opens popover', async () => {
    // Find and click the upload progress button using the test ID
    const uploadButton = window.locator('[data-testid="upload-progress-button"]');

    // Log the number of matching elements and their HTML for debugging
    const count = await uploadButton.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await uploadButton.nth(i).evaluate(el => el.outerHTML);
      }
    }

    // Wait for the button to be visible and enabled
    await expect(uploadButton).toBeVisible({ timeout: 10000 });
    await expect(uploadButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button to open
    await uploadButton.click();

    // Use a more specific selector for the upload popover
    const uploadPopover = window.locator('div[role="presentation"].MuiPopover-root').filter({
      has: window.getByRole('heading', { name: 'Uploads' })
    });

    // Wait for the specific upload popover to be visible
    await expect(uploadPopover).toBeVisible({ timeout: 10000 });
    
    // Verify popover content within the specific upload popover
    const popoverTitle = uploadPopover.getByRole('heading', { name: 'Uploads' });
    await expect(popoverTitle).toBeVisible({ timeout: 10000 });
    
    // Verify tabs are present within the specific upload popover
    const tabs = uploadPopover.getByRole('button').filter({ hasText: /All uploads|Completed|Skipped|Failed/ });
    await expect(tabs).toHaveCount(4, { timeout: 10000 });

    // Click the button again to close
    await uploadButton.click();

    // Verify the popover is hidden
    await expect(uploadPopover).not.toBeVisible({ timeout: 10000 });
  });

  test('notifications button is clickable and opens popover', async () => {
    // Find and click the notifications button
    const notificationsButton = window.locator('[data-testid="notifications-button"]');
    await expect(notificationsButton).toBeVisible({ timeout: 10000 });
    await expect(notificationsButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button to open
    await notificationsButton.click();

    // Use a more specific selector for the notifications popover
    const notificationsPopover = window.locator('div[role="presentation"].MuiPopover-root').filter({
      has: window.getByRole('heading', { name: 'Notifications' })
    });

    // Wait for the specific notifications popover to be visible
    await expect(notificationsPopover).toBeVisible({ timeout: 10000 });
    
    // Verify popover content within the specific notifications popover
    const popoverTitle = notificationsPopover.getByRole('heading', { name: 'Notifications' });
    await expect(popoverTitle).toBeVisible({ timeout: 10000 });

    // Verify empty state message when no notifications within the specific popover
    const emptyMessage = notificationsPopover.getByText("You're all caught up!");
    await expect(emptyMessage).toBeVisible({ timeout: 10000 });
    const subMessage = notificationsPopover.getByText("No new notifications");
    await expect(subMessage).toBeVisible({ timeout: 10000 });

    // Click the button again to close
    await notificationsButton.click();

    // Verify the popover is hidden
    await expect(notificationsPopover).not.toBeVisible({ timeout: 10000 });
  });

  test('can add and delete tabs', async () => {
    // Find the tab bar and initial tab count
    const initialTabCount = await window.locator('[data-testid^="tab-"]').count();
    
    // Find and click the new tab button
    const newTabButton = window.locator('[data-testid="new-tab-button"]');
    await expect(newTabButton).toBeVisible({ timeout: 10000 });
    await newTabButton.click();
    
    // Wait for animation and verify new tab was added
    await window.waitForTimeout(300); // Wait for animation to complete
    const newTabCount = await window.locator('[data-testid^="tab-"]').count();
    expect(newTabCount).toBe(initialTabCount + 1);

    // Get the last tab (which should be the new one)
    const newTab = window.locator('[data-testid^="tab-"]').last();
    await expect(newTab).toBeVisible({ timeout: 10000 });

    // Find and click the close button on the new tab
    const closeButton = newTab.locator('button[id^="tab-close-button-"]');
    await expect(closeButton).toBeVisible({ timeout: 10000 });
    await closeButton.click();
    
    // Wait for animation and verify tab was removed
    await window.waitForTimeout(300); // Wait for animation to complete
    const finalTabCount = await window.locator('[data-testid^="tab-"]').count();
    expect(finalTabCount).toBe(initialTabCount);
  });

  test('account button is clickable and opens popover', async () => {
    // Find and click the account button
    const accountButton = window.locator('[data-testid="account-menu-button"]');
    await expect(accountButton).toBeVisible({ timeout: 10000 });
    await expect(accountButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button to open
    await accountButton.click();
    
    // Use a specific selector for the account popover
    const accountPopover = window.locator('div[data-testid="account-menu"]');
    
    // Verify popover is visible
    await expect(accountPopover).toBeVisible({ timeout: 10000 });

    // Click the button again to close
    await accountButton.click();

    // Verify the popover is hidden
    await expect(accountPopover).not.toBeVisible({ timeout: 10000 });
  });

  test('share button is clickable and opens popover', async () => {
    // Find and click the share button
    const shareButton = window.locator('[data-testid="share-file-button"]');
    await expect(shareButton).toBeVisible({ timeout: 10000 });
    await expect(shareButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button
    await shareButton.click();
    await window.waitForTimeout(100); // Wait for click to register
    
    // Use a specific selector for the share popover
    const sharePopover = window.locator('[data-testid="share-file-popover"]');
    
    // Verify popover is visible
    await expect(sharePopover).toBeVisible({ timeout: 10000 });
    
    // Verify all share options are present
    const addPeopleButton = sharePopover.getByText('Add people');
    const permissionsButton = sharePopover.getByText('Permissions');
    const copyLinkButton = sharePopover.getByText('Copy link');

    await expect(addPeopleButton).toBeVisible();
    await expect(permissionsButton).toBeVisible();
    await expect(copyLinkButton).toBeVisible();

    // Click outside the popover to close it (click at coordinates far from the popover)
    await window.mouse.click(0, 0);
    await window.waitForTimeout(100); // Wait for click to register

    // Verify the popover is hidden
    await expect(sharePopover).not.toBeVisible({ timeout: 10000 });
    await window.waitForTimeout(500); // Wait for any animations to complete
  });

  test('change view button is clickable and opens popover', async () => {
    // Wait a moment for any previous popovers to fully close
    await window.waitForTimeout(500);

    // Find and click the view button
    const viewButton = window.locator('[data-testid="change-view-button"]');
    await expect(viewButton).toBeVisible({ timeout: 10000 });
    await expect(viewButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button to open
    await viewButton.click();
    await window.waitForTimeout(100); // Wait for click to register
    
    // Use a specific selector for the view popover
    const viewPopover = window.locator('[data-testid="change-view-menu"]');
    
    // Verify popover is visible
    await expect(viewPopover).toBeVisible({ timeout: 10000 });

    // Wait a moment before closing
    await window.waitForTimeout(100);

    // Click outside to close
    await window.locator('.MuiBackdrop-root').click();
    await window.waitForTimeout(100); // Wait for click to register

    // Verify the popover is hidden
    await expect(viewPopover).not.toBeVisible({ timeout: 10000 });
    await window.waitForTimeout(500); // Wait for any animations to complete
  });


  test('change view button can change to large grid view', async () => {
    // Wait a moment for any previous popovers to fully close
    await window.waitForTimeout(500);

    // Open view options
    const viewButton = window.locator('[data-testid="change-view-button"]');
    await expect(viewButton).toBeVisible({ timeout: 10000 });
    await expect(viewButton).toBeEnabled({ timeout: 10000 });
    await viewButton.click();
    await window.waitForTimeout(100); // Wait for click to register
    
    // Find and click large grid view option
    const viewPopover = window.locator('[data-testid="change-view-menu"]');
    await expect(viewPopover).toBeVisible({ timeout: 10000 });
    
    const largeGridViewOption = viewPopover.locator('[data-testid="view-option-large_grid"]');
    await expect(largeGridViewOption).toBeVisible({ timeout: 10000 });
    await largeGridViewOption.click();
    await window.waitForTimeout(100); // Wait for click to register
    
    // Verify the view has changed
    const fileList = window.locator('[data-testid="file-list"]');
    await expect(fileList).toBeVisible({ timeout: 10000 });
    await expect(fileList).toHaveAttribute('data-view', 'large_grid', { timeout: 10000 });
    await window.waitForTimeout(500); // Wait for any animations to complete
  });


  test('upload button uploads a file', async () => {
    // TODO: Implement test
  });

  test('delete button deletes a file', async () => {
    // TODO: Implement test
  });

  test('navigate back button navigates back', async () => {
    // TODO: Implement test after functionality is fixed
  });

  test('navigate forward button navigates forward', async () => {
    // TODO: Implement test after functionality is fixed
  });


  test('download button downloads a file', async () => {
    // Use the recovery wrapper to handle login/onboarding issues automatically
    await wrapWithRecovery(window, async () => {
      // Only run this test if we have files available
      const hasFiles = await window.evaluate(() => {
        const fileItems = document.querySelectorAll('[data-testid="file-item"]');
        return fileItems.length > 0;
      });

      if (!hasFiles) {
        console.log('Skipping download test: No files available');
        test.skip();
        return;
      }
      
      // Wait for websocket connection
      await waitForWebsocketConnection(window);
      
      // 1. Select a file by clicking its checkbox
      const firstFileRow = window.locator('[data-testid="file-item"]').first();
      await firstFileRow.click();
      
      // 2. Wait for download button to be enabled
      const downloadButton = window.locator('[data-testid="download-button"]');
      await expect(downloadButton).toBeVisible({ timeout: 10000 });
      await expect(downloadButton).toBeEnabled({ timeout: 10000 });
      
      // 3. Click the download button
      await downloadButton.click();
      
      // 6. Wait for download progress indicator to appear
      const downloadProgressButton = window.locator('[data-testid="download-progress-button"]');
      await expect(downloadProgressButton).toBeVisible({ timeout: 10000 });
      
      // 7. Click the download progress button to view download status
      await downloadProgressButton.click();
      
      // 8. Verify download popover shows the download
      const popover = window.locator('div[role="presentation"].MuiPopover-root');
      await expect(popover).toBeVisible({ timeout: 10000 });
      
      // 9. Close the popover
      await downloadProgressButton.click();
      await expect(popover).not.toBeVisible({ timeout: 10000 });
      
      // 10. Deselect the file
      await firstFileRow.click();
    });
  });

});



