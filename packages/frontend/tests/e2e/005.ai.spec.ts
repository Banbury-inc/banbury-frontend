import { test, expect, Page } from '@playwright/test'
import { ensureLoggedInAndOnboarded, TestUserCredentials } from './utils/test-user'
import { getSharedContext } from './utils/test-runner'

// This will hold our page object throughout the test file
let page: Page;

test.describe('AI tests', () => {
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
    
    // Click on the AI tab
    await page.click('[data-testid="sidebar-button-AI"]');

    // Wait for the main interface to load
    await page.waitForSelector('[data-testid="main-component"]', {
      timeout: 30000
    });
  });

  test.beforeEach(async () => {
    // Just ensure we're on the main interface before each test
    await page.waitForSelector('[data-testid="main-component"]', {
      timeout: 30000
    });
  });

  test('download progress button is clickable and opens popover', async () => {
    // Find and click the download progress button using the test ID
    const downloadButton = page.locator('[data-testid="download-progress-button"]');

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
    const popover = page.locator('div[role="presentation"].MuiPopover-root');
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