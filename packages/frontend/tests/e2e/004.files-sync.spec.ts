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


  test('delete button can delete a file from sync', async () => {

    // click on the sync tab
    await page.locator('[data-testid="file-tree-item-Sync"]').click();

    // 1. Select a file by clicking its checkbox
    const firstFileRow = page.locator('[data-testid="file-item"]').first();
    await firstFileRow.click();

    // 2. Wait for delete button to be enabled
    const deleteButton = page.locator('[data-testid="delete-button"]');
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await expect(deleteButton).toBeEnabled({ timeout: 10000 });    
    // Click the button
    await deleteButton.click();

    // 3. Verify we get an alert that the file was deleted from sync
    const alert = page.locator('[data-testid="alert-success"]');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText('Delete completed successfully', { timeout: 10000 });
    await expect(alert).not.toBeVisible({ timeout: 10000 });

    // 4. Verify the file is no longer in the sync list
    await expect(firstFileRow).not.toBeVisible({ timeout: 10000 });
  });

});
