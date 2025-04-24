import { test, expect, Page } from '@playwright/test'
import { ensureLoggedInAndOnboarded, TestUserCredentials, dismissUnexpectedDialogs, wrapWithRecovery as _wrapWithRecovery } from './utils/test-user'
import { getSharedContext } from './utils/test-runner'

// This will hold our page object throughout the test file
let page: Page;

test.describe('Settings tests', () => {
  test.beforeAll(async () => {
    // Get the shared context
    const sharedContext = getSharedContext();
    page = sharedContext.window!;
    if (!page) {
      throw new Error('Page is not initialized');
    }

    // Ensure user is logged in and onboarded
    await ensureLoggedInAndOnboarded(page);
    
    // Click on the Settings tab
    await page.click('[data-testid="sidebar-button-Settings"]');

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

  test('can edit phone number', async () => {
    const phoneInput = page.locator('[data-testid="phone-number-input"] input');

    await expect(phoneInput).toBeVisible({ timeout: 5000 });
    await phoneInput.click();
    
    // Generate a random phone number
    const randomPhone = `555${Math.floor(1000000 + Math.random() * 9000000)}`;
    
    await phoneInput.fill(randomPhone);
    
    // Click save
    const saveButton = page.locator('[data-testid="save-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    
    // Wait for the success notification
    const notification = page.locator('[data-testid="alert-success"]');
    await expect(notification).toBeVisible();
  });

  test('can edit email', async () => {
    const emailInput = page.locator('[data-testid="email-input"] input');

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.click();
    
    // Generate a random email
    const randomEmail = `test.user.${Math.floor(Math.random() * 10000)}@example.com`;

    await emailInput.fill(randomEmail);
    
    // Click save
    const saveButton = page.locator('[data-testid="save-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    
    // Wait for the success notification
    const notification = page.locator('[data-testid="alert-success"]');
    await expect(notification).toBeVisible();
  });

  test('can delete account', async () => {
    // Navigate to the app tab
    await page.click('[data-testid="sidebar-button-app"]');

    const deleteButton = page.locator('[data-testid="delete-account-button"]');
    
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    
    await deleteButton.click();
    
    // Look for the final confirmation button
    const confirmButton = page.locator('button:has-text("Delete Account"), button:has-text("Confirm"), button:has-text("Yes")');
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    
    // Confirm the deletion
    await confirmButton.click();
    
    // Allow longer timeout as account deletion might take some processing time
    const redirected = await page.waitForSelector('h1:has-text("Sign in"), h1:has-text("Login"), .login-screen', {
      timeout: 30000
    }).then(() => true).catch(() => false);
    
    // Assert that either we were redirected to login or we got a success message
    expect(redirected).toBeTruthy();
  });
});
