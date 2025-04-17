import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import { getElectronConfig } from './utils/electron-config'
import { ensureLoggedInAndOnboarded, TestUserCredentials, dismissUnexpectedDialogs, wrapWithRecovery as _wrapWithRecovery } from './utils/test-user'

test.describe('Settings tests', () => {
  let electronApp;
  let window;
  let _testUserCredentials: TestUserCredentials;

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
    _testUserCredentials = await ensureLoggedInAndOnboarded(window);

    // Click on the Settings tab
    await window.click('[data-testid="sidebar-button-Settings"]');

    // Wait for the main interface to load
    await window.waitForSelector('[data-testid="main-component"]', {
      timeout: 30000
    });
  });

  test.beforeEach(async () => {
    // Dismiss any unexpected dialogs
    await dismissUnexpectedDialogs(window);
    
    // Check if we're on the settings page
    const isOnSettingsPage = await window.locator('h1:has-text("Settings")').isVisible({
      timeout: 5000
    }).catch(() => false);
    
    // If not on settings, navigate there
    if (!isOnSettingsPage) {
      await window.click('[data-testid="sidebar-button-Settings"]').catch(error => {
        console.warn('Error clicking settings button:', error);
      });
      
      // Wait for settings page to load
      await window.waitForSelector('h1:has-text("Settings")', { 
        timeout: 1000
      }).catch(error => {
        console.warn('Error waiting for settings page:', error);
      });
    }
    
    // Make sure we're on the main interface
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

  test('can edit phone number', async () => {

      const phoneInput = window.locator('[data-testid="phone-number-input"] input');

      await expect(phoneInput).toBeVisible({ timeout: 5000 });
      await phoneInput.click();
      
      // Generate a random phone number
      const randomPhone = `555${Math.floor(1000000 + Math.random() * 9000000)}`;
      
      await phoneInput.fill(randomPhone);
      
      // Click save
      const saveButton = window.locator('[data-testid="save-button"]');
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      await saveButton.click();
      
      // Wait for the success notification
      const notification = window.locator('[data-testid="alert-success"]');
      await expect(notification).toBeVisible({ timeout: 10000 });
      
      
      
  });

  test('can edit email', async () => {
      const emailInput = window.locator('[data-testid="email-input"] input');

      await expect(emailInput).toBeVisible({ timeout: 5000 });
      await emailInput.click();
      
      // Generate a random email
      const randomEmail = `test.user.${Math.floor(Math.random() * 10000)}@example.com`;

      await emailInput.fill(randomEmail);
      
      // Click save
      const saveButton = window.locator('[data-testid="save-button"]');
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      await saveButton.click();
      
      // Wait for the success notification
      const notification = window.locator('[data-testid="alert-success"]');
      await expect(notification).toBeVisible({ timeout: 10000 });

  });

  test('can delete account', async () => {

      // Navigate to the app tab
      await window.click('[data-testid="sidebar-button-app"]');

      const deleteButton = window.locator('[data-testid="delete-account-button"]');
      
      await expect(deleteButton).toBeVisible({ timeout: 10000 });
      
      await deleteButton.click();
      
      
      // Look for the final confirmation button
      const confirmButton = window.locator('button:has-text("Delete Account"), button:has-text("Confirm"), button:has-text("Yes")');
      await expect(confirmButton).toBeVisible({ timeout: 5000 });
      
      // Confirm the deletion
      await confirmButton.click();
      
      // Allow longer timeout as account deletion might take some processing time
      const redirected = await window.waitForSelector('h1:has-text("Sign in"), h1:has-text("Login"), .login-screen', {
        timeout: 30000
      }).then(() => true).catch(() => false);
      
      // Assert that either we were redirected to login or we got a success message
      expect(redirected).toBeTruthy();
  });
});
