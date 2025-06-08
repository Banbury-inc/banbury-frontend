import { test, Page } from '@playwright/test'
import _fs from 'fs'
import { ensureLoggedInAndOnboarded } from './utils/test-user'
import { getSharedContext } from './utils/test-runner'

// This will hold our page object throughout the test file
let page: Page;

test.describe('Files cloud tests', () => {

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

  // test.afterAll(async () => {
  //   // We don't close the app here as it's managed by the global teardown
  // });

  //   test('download button can download a file from cloud', async () => {

  //   // click on the cloud tab
  //   await page.locator('[data-testid="file-tree-item-Cloud"]').click();

  //   // 1. Select a file by clicking its checkbox
  //   const firstFileRow = page.locator('[data-testid="file-item"]').first();
  //   await firstFileRow.click();

  //   // 2. Wait for download button to be enabled
  //   const downloadButton = page.locator('[data-testid="download-button"]');
  //   await expect(downloadButton).toBeVisible({ timeout: 10000 });
  //   await expect(downloadButton).toBeEnabled({ timeout: 10000 });    
  //   // Click the button
  //   await downloadButton.click();

  //   // 3. Verify we get an alert that the file was downloaded from cloud
  //   const alert = page.locator('[data-testid="alert-success"]');
  //   await expect(alert).toBeVisible({ timeout: 10000 });
  //   await expect(alert).toContainText('Download completed successfully', { timeout: 10000 });
  //   await expect(alert).not.toBeVisible({ timeout: 10000 });

  // });


  //   test('delete button can delete a file from cloud', async () => {


  //   // 1. Select a file by clicking its checkbox
  //   const firstFileRow = page.locator('[data-testid="file-item"]').first();
  //   await firstFileRow.click();

  //   // 2. Wait for delete button to be enabled
  //   const deleteButton = page.locator('[data-testid="delete-button"]');
  //   await expect(deleteButton).toBeVisible({ timeout: 10000 });
  //   await expect(deleteButton).toBeEnabled({ timeout: 10000 });    
  //   // Click the button
  //   await deleteButton.click();

  //   // 3. Verify we get an alert that the file was deleted from cloud
  //   const alert = page.locator('[data-testid="alert-success"]');
  //   await expect(alert).toBeVisible({ timeout: 10000 });
  //   await expect(alert).toContainText('Delete completed successfully', { timeout: 10000 });
  //   await expect(alert).not.toBeVisible({ timeout: 10000 });

  // });



});
