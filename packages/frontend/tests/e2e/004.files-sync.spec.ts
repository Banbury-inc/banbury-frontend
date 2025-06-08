import { test, expect, Page } from '@playwright/test'
import _fs from 'fs'
import { ensureLoggedInAndOnboarded } from './utils/test-user'
import { getSharedContext } from './utils/test-runner'

// This will hold our page object throughout the test file
let page: Page;

test.describe('Files sync tests', () => {

  test.beforeAll(async () => {
    // Get the shared context and ensure it's initialized
    const sharedContext = getSharedContext();
    await sharedContext.initialize();
    
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


  // test('delete button can delete a file from sync', async () => {

  //   // Navigate to the sync tab
  //   const syncTab = page.locator('[data-testid="file-tree-item-Sync"]');
  //   await expect(syncTab).toBeVisible({ timeout: 10000 });
  //   await syncTab.click();

  //   // Wait for sync tab content to load
  //   await page.waitForTimeout(2000);

  //   // Wait for sync files to be visible (extended timeout for content loading)
  //   const firstFileRow = page.locator('[data-testid="file-item"]').first();
  //   await expect(firstFileRow).toBeVisible({ timeout: 15000 });

  //   // Select a file by clicking its checkbox
  //   await firstFileRow.click();

  //   // Wait for delete button to be enabled
  //   const deleteButton = page.locator('[data-testid="delete-button"]');
  //   await expect(deleteButton).toBeVisible({ timeout: 10000 });
  //   await expect(deleteButton).toBeEnabled({ timeout: 10000 });
    
  //   // Click the delete button
  //   await deleteButton.click();

  //   // Wait for either success or error alert to appear
  //   const successAlert = page.locator('[data-testid="alert-success"]');
  //   const errorAlert = page.locator('[data-testid="alert-error"]');
    
  //   // Wait for either success or error alert with extended timeout
  //   await Promise.race([
  //     expect(successAlert).toBeVisible({ timeout: 30000 }),
  //     expect(errorAlert).toBeVisible({ timeout: 30000 })
  //   ]);

  //   // Check which alert appeared and handle accordingly
  //   const isSuccessVisible = await successAlert.isVisible();
  //   const isErrorVisible = await errorAlert.isVisible();
    
  //   if (isSuccessVisible) {
  //     await successAlert.textContent();
  //     // Be more flexible with the message text as it might vary
  //     await expect(successAlert).toContainText(/Delete.*success|completed|removed/i, { timeout: 10000 });
  //     await expect(successAlert).not.toBeVisible({ timeout: 10000 });
  //   } else if (isErrorVisible) {
  //     // Log the error message for debugging
  //     const errorText = await errorAlert.textContent();
  //     console.error('Delete operation failed:', errorText);
  //     throw new Error(`Test failed due to delete error: ${errorText}`);
  //   } else {
  //     throw new Error('Neither success nor error alert appeared within timeout period');
  //   }

  //   // Verify the file is no longer in the sync list
  //   await expect(firstFileRow).not.toBeVisible({ timeout: 10000 });
  // });

});
