import { test, expect, Page } from '@playwright/test'
import _fs from 'fs'
import { waitForWebsocketConnection, TestUserCredentials, ensureLoggedInAndOnboarded, dismissUnexpectedDialogs, wrapWithRecovery } from './utils/test-user'
import { getSharedContext } from './utils/test-runner'
import * as path from 'path'

// This will hold our page object throughout the test file
let page: Page;

test.describe('Files tests', () => {
  let _testUserCredentials: TestUserCredentials;

  test.beforeAll(async () => {
    // Get the shared context
    const sharedContext = getSharedContext();
    page = sharedContext.window!;
    if (!page) {
      throw new Error('Page is not initialized');
    }

    // Ensure user is logged in and onboarded
    await ensureLoggedInAndOnboarded(page);
  });

  test.afterAll(async () => {
    // We don't close the app here as it's managed by the global teardown
  });

  test('download progress button is clickable and opens popover', async () => {
    // Find and click the download progress button using the test ID
    const downloadButton = page.locator('[data-testid="download-progress-button"]');

    // Log the number of matching elements and their HTML for debugging
    const count = await downloadButton.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        console.info(await downloadButton.nth(i).evaluate(el => el.outerHTML));
      }
    }

    // Wait for the button to be visible and enabled
    await expect(downloadButton).toBeVisible({ timeout: 10000 });
    await expect(downloadButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button to open
    await downloadButton.click();

    // Verify the popover appears with increased timeout
    const popover = page.locator('div[role="presentation"].MuiPopover-root');
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
    const uploadButton = page.locator('[data-testid="upload-progress-button"]');

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
    const uploadPopover = page.locator('div[role="presentation"].MuiPopover-root').filter({
      has: page.getByRole('heading', { name: 'Uploads' })
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
    const notificationsButton = page.locator('[data-testid="notifications-button"]');
    await expect(notificationsButton).toBeVisible({ timeout: 10000 });
    await expect(notificationsButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button to open
    await notificationsButton.click();

    // Use a more specific selector for the notifications popover
    const notificationsPopover = page.locator('div[role="presentation"].MuiPopover-root').filter({
      has: page.getByRole('heading', { name: 'Notifications' })
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
    const initialTabCount = await page.locator('[data-testid^="tab-"]').count();
    
    // Find and click the new tab button
    const newTabButton = page.locator('[data-testid="new-tab-button"]');
    await expect(newTabButton).toBeVisible({ timeout: 10000 });
    await newTabButton.click();
    
    // Wait for animation and verify new tab was added
    await page.waitForTimeout(300); // Wait for animation to complete
    const newTabCount = await page.locator('[data-testid^="tab-"]').count();
    expect(newTabCount).toBe(initialTabCount + 1);

    // Get the last tab (which should be the new one)
    const newTab = page.locator('[data-testid^="tab-"]').last();
    await expect(newTab).toBeVisible({ timeout: 10000 });

    // Find and click the close button on the new tab
    const closeButton = newTab.locator('button[id^="tab-close-button-"]');
    await expect(closeButton).toBeVisible({ timeout: 10000 });
    await closeButton.click();
    
    // Wait for animation and verify tab was removed
    await page.waitForTimeout(300); // Wait for animation to complete
    const finalTabCount = await page.locator('[data-testid^="tab-"]').count();
    expect(finalTabCount).toBe(initialTabCount);
  });

  test('account button is clickable and opens popover', async () => {
    // Find and click the account button
    const accountButton = page.locator('[data-testid="account-menu-button"]');
    await expect(accountButton).toBeVisible({ timeout: 10000 });
    await expect(accountButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button to open
    await accountButton.click();
    
    // Use a specific selector for the account popover
    const accountPopover = page.locator('div[data-testid="account-menu"]');
    
    // Verify popover is visible
    await expect(accountPopover).toBeVisible({ timeout: 10000 });

    // Click the button again to close
    await accountButton.click();

    // Verify the popover is hidden
    await expect(accountPopover).not.toBeVisible({ timeout: 10000 });
  });


  test('sync button is clickable and opens popover', async () => {
    // Find and click the share button
    const syncButton = page.locator('[data-testid="sync-button"]');
    await expect(syncButton).toBeVisible({ timeout: 10000 });
    await expect(syncButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button
    await syncButton.click();
    await page.waitForTimeout(100); // Wait for click to register
    
    // Use a specific selector for the sync popover
    const syncPopover = page.locator('[data-testid="sync-popover"]');
    
    // Verify popover is visible
    await expect(syncPopover).toBeVisible({ timeout: 10000 });
    
    // Verify all sync options are present
    const addFolderButton = syncPopover.locator('[data-testid="add-folder-button"]');
    await expect(addFolderButton).toBeVisible();
    await expect(addFolderButton).toBeEnabled();

    // Click outside the popover to close it (click at coordinates far from the popover)
    await page.mouse.click(0, 0);
    await page.waitForTimeout(100); // Wait for click to register

    // Verify the popover is hidden
    await expect(syncPopover).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500); // Wait for any animations to complete
  });


  test('sync popover can add a folder and scan it', async () => {
    // Use the recovery wrapper
    await wrapWithRecovery(page, async () => {
      // Find and click the sync button
      const syncButton = page.locator('[data-testid="sync-button"]');
      await expect(syncButton).toBeVisible({ timeout: 10000 });
      await expect(syncButton).toBeEnabled({ timeout: 10000 });
      
      // Click the button
      await syncButton.click();
      await page.waitForTimeout(100); // Wait for click to register
      
      // Use a specific selector for the sync popover
      const syncPopover = page.locator('[data-testid="sync-popover"]');
      
      // Verify popover is visible
      await expect(syncPopover).toBeVisible({ timeout: 10000 });

      // Verify that we no longer see Loading... text
      const loadingText = syncPopover.getByText('Loading...');
      await expect(loadingText).not.toBeVisible({ timeout: 10000 });
      
      // Verify the add folder button is present
      const addFolderButton = syncPopover.locator('[data-testid="add-folder-button"]');
      await expect(addFolderButton).toBeVisible();
      await expect(addFolderButton).toBeEnabled();

      // Prepare to handle the file chooser dialog
      const [fileChooser] = await Promise.all([
        // It is important to call waitForEvent before click to set up waiting.
        page.waitForEvent('filechooser'),
        // Opens the file chooser.
        addFolderButton.click()
      ]);

      // Define a dummy directory path to select.
      // Note: The actual selection doesn't matter much here,
      // we just need to resolve the dialog. We use the current test directory.
      const dummyFolderPath = path.resolve(__dirname); 
      await fileChooser.setFiles(dummyFolderPath);

      // Optional: Add verification step here if the UI provides feedback
      // e.g., check if the popover content updates or a success message appears.
      // For now, we just ensure the dialog was handled.
      
      // Verify the new dummy folder is present
      const dummyFolder = page.locator('[data-testid="sync-popover"]').filter({ hasText: dummyFolderPath });
      await expect(dummyFolder).toBeVisible({ timeout: 10000 });

      // Find and click the sync button
      await expect(syncButton).toBeVisible({ timeout: 10000 });
      await expect(syncButton).toBeEnabled({ timeout: 10000 });
      // Wait a moment for any potential UI updates
      await page.waitForTimeout(500);
      // Scan button
      const scanButton = syncPopover.locator('button:has-text("Scan")');
      await expect(scanButton).toBeVisible({ timeout: 10000 });
      await expect(scanButton).toBeEnabled({ timeout: 10000 });
      await scanButton.click();
      await page.waitForTimeout(100); // Wait for click to register

      // Assign each progress bar to a separate variable
      const progressBars = await page.locator('[data-testid="progress-bar"]').all();
      for (const progressBar of progressBars) {
        // Verify the progress bar is visible
        await expect(progressBar).toBeVisible({ timeout: 10000 });

        // Poll until progress reaches 100%
        let progressValue = 0;
        const maxAttempts = 30;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          progressValue = await progressBar.evaluate(el => {
            const value = el.getAttribute('aria-valuenow');
            return parseInt(value || "0");
          });
          
          if (progressValue === 100) {
            break;
          }
          
          // Log progress for debugging
          console.log(`Progress: ${progressValue}%, attempt: ${attempt + 1}/${maxAttempts}`);
          
          // Wait before next check
          await page.waitForTimeout(1000);
        }
        
        // Verify the progress reached 100%
        expect(progressValue).toBe(100);
      }


      // Click outside the popover to close it
      await page.locator('body').click({ position: { x: 0, y: 0 }, force: true });
      await page.waitForTimeout(100); // Wait for click to register

      // Verify the popover is hidden
      await expect(syncPopover).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500); // Wait for any animations to complete
    });
  });


  test('sync popover can remove a folder', async () => {
    // Use the recovery wrapper
    await wrapWithRecovery(page, async () => {
      // Find and click the sync button
      const syncButton = page.locator('[data-testid="sync-button"]');
      await expect(syncButton).toBeVisible({ timeout: 10000 });
      await expect(syncButton).toBeEnabled({ timeout: 10000 });
      await syncButton.click();
      await page.waitForTimeout(100); // Wait for click to register

      // Use a specific selector for the sync popover
      const syncPopover = page.locator('[data-testid="sync-popover"]');
      await expect(syncPopover).toBeVisible({ timeout: 10000 });
      
      // Wait for folders to load
      await page.waitForTimeout(1000);
      
      // First check if there's at least one folder visible
      const folderCount = await syncPopover.locator('[data-testid="remove-folder-button"]').count();
      if (folderCount === 0) {
        console.log('No folders to remove, adding a test folder first');
        
        // Add a folder first if there are none
        const addFolderButton = syncPopover.locator('[data-testid="add-folder-button"]');
        await expect(addFolderButton).toBeVisible();
        await expect(addFolderButton).toBeEnabled();

        // Prepare to handle the file chooser dialog
        const [fileChooser] = await Promise.all([
          // It is important to call waitForEvent before click to set up waiting.
          page.waitForEvent('filechooser'),
          // Opens the file chooser.
          addFolderButton.click()
        ]);

        // Define a dummy directory path to select
        const dummyFolderPath = path.resolve(__dirname); 
        await fileChooser.setFiles(dummyFolderPath);
        
        // Wait for the folder to appear
        await page.waitForTimeout(2000);
      }
      
      // Get folder items and store the text of the first folder
      const folders = await syncPopover.locator('div').filter({ hasText: path.sep }).all();
      expect(folders.length).toBeGreaterThan(0);
      
      // Store the text content of the first folder to verify it's removed later
      const firstFolderText = await folders[0].textContent();
      console.log("Folder to be removed:", firstFolderText);
      
      // Find and click the remove folder button for the first folder
      const removeFolderButton = syncPopover.locator('[data-testid="remove-folder-button"]').first();
      await expect(removeFolderButton).toBeVisible({ timeout: 10000 });
      await removeFolderButton.click();
      
      // Wait for the removal operation to complete
      await page.waitForTimeout(3000);
      
      // Check that the folder is no longer visible
      const remainingFolders = await syncPopover.locator('div').filter({ hasText: firstFolderText || '' }).count();
      expect(remainingFolders).toBe(0);

      // Click outside the popover to close it
      await page.locator('body').click({ position: { x: 0, y: 0 }, force: true });
      await page.waitForTimeout(100); // Wait for click to register

      // Verify the popover is hidden
      await expect(syncPopover).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500); // Wait for any animations to complete
    });
  });



  test('share button is clickable and opens popover', async () => {
    // Find and click the share button
    const shareButton = page.locator('[data-testid="share-file-button"]');
    await expect(shareButton).toBeVisible({ timeout: 10000 });
    await expect(shareButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button
    await shareButton.click();
    await page.waitForTimeout(100); // Wait for click to register
    
    // Use a specific selector for the share popover
    const sharePopover = page.locator('[data-testid="share-file-popover"]');
    
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
    await page.mouse.click(0, 0);
    await page.waitForTimeout(100); // Wait for click to register

    // Verify the popover is hidden
    await expect(sharePopover).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500); // Wait for any animations to complete
  });

  test('change view button is clickable and opens popover', async () => {
    // Wait a moment for any previous popovers to fully close
    await page.waitForTimeout(500);

    // Find and click the view button
    const viewButton = page.locator('[data-testid="change-view-button"]');
    await expect(viewButton).toBeVisible({ timeout: 10000 });
    await expect(viewButton).toBeEnabled({ timeout: 10000 });
    
    // Click the button to open
    await viewButton.click();
    await page.waitForTimeout(100); // Wait for click to register
    
    // Use a specific selector for the view popover
    const viewPopover = page.locator('[data-testid="change-view-menu"]');
    
    // Verify popover is visible
    await expect(viewPopover).toBeVisible({ timeout: 10000 });

    // Wait a moment before closing
    await page.waitForTimeout(100);

    // Click outside to close
    await page.locator('.MuiBackdrop-root').click();
    await page.waitForTimeout(100); // Wait for click to register

    // Verify the popover is hidden
    await expect(viewPopover).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500); // Wait for any animations to complete
  });


  test('change view button can change to large grid view', async () => {
    // Wait a moment for any previous popovers to fully close
    await page.waitForTimeout(500);

    // Open view options
    const viewButton = page.locator('[data-testid="change-view-button"]');
    await expect(viewButton).toBeVisible({ timeout: 10000 });
    await expect(viewButton).toBeEnabled({ timeout: 10000 });
    await viewButton.click();
    await page.waitForTimeout(100); // Wait for click to register
    
    // Find and click large grid view option
    const viewPopover = page.locator('[data-testid="change-view-menu"]');
    await expect(viewPopover).toBeVisible({ timeout: 10000 });
    
    const largeGridViewOption = viewPopover.locator('[data-testid="view-option-large_grid"]');
    await expect(largeGridViewOption).toBeVisible({ timeout: 10000 });
    await largeGridViewOption.click();
    await page.waitForTimeout(100); // Wait for click to register
    
    // Verify the view has changed
    const fileList = page.locator('[data-testid="file-list"]');
    await expect(fileList).toBeVisible({ timeout: 10000 });
    await expect(fileList).toHaveAttribute('data-view', 'large_grid', { timeout: 10000 });
    await page.waitForTimeout(500); // Wait for any animations to complete
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
    await wrapWithRecovery(page, async () => {
      // Only run this test if we have files available
      const hasFiles = await page.evaluate(() => {
        const fileItems = document.querySelectorAll('[data-testid="file-item"]');
        return fileItems.length > 0;
      });

      if (!hasFiles) {
        console.info('Skipping download test: No files available');
        test.skip();
        return;
      }
      
      // Wait for websocket connection
      await waitForWebsocketConnection(page);
      
      // 1. Select a file by clicking its checkbox
      const firstFileRow = page.locator('[data-testid="file-item"]').first();
      await firstFileRow.click();
      
      // 2. Wait for download button to be enabled
      const downloadButton = page.locator('[data-testid="download-button"]');
      await expect(downloadButton).toBeVisible({ timeout: 10000 });
      await expect(downloadButton).toBeEnabled({ timeout: 10000 });
      
      // 3. Click the download button
      await downloadButton.click();
      
      // 6. Wait for download progress indicator to appear
      const downloadProgressButton = page.locator('[data-testid="download-progress-button"]');
      await expect(downloadProgressButton).toBeVisible({ timeout: 10000 });
      
      // 7. Click the download progress button to view download status
      await downloadProgressButton.click();
      
      // 8. Verify download popover shows the download
      const popover = page.locator('div[role="presentation"].MuiPopover-root');
      await expect(popover).toBeVisible({ timeout: 10000 });
      
      // 9. Close the popover
      await downloadProgressButton.click();
      await expect(popover).not.toBeVisible({ timeout: 10000 });
      
      // 10. Deselect the file
      await firstFileRow.click();
    });
  });

});



