import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import { getElectronConfig } from './utils/electron-config'
import { 
  generateRandomUsername as _generateRandomUsername, 
  getSharedTestUserCredentials,
  createTestUserIfNeeded as _createTestUserIfNeeded
} from './utils/test-user'

test.describe('Account creation tests', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Get the correct path to the Electron app
    const electronPath = path.resolve(__dirname, '../../');
    
    // Launch Electron app with shared configuration
    electronApp = await electron.launch(getElectronConfig(electronPath))
      .catch(async (error) => {
        console.error('Failed to launch electron:', error);
        throw error;
      });

    // Wait for app to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    const isPackaged = await electronApp.evaluate(async ({ app }) => {
      return app.isPackaged;
    });

    expect(isPackaged).toBe(false);

    // Wait for the first BrowserWindow to open
    window = await electronApp.firstWindow();
    
    // Ensure the window is loaded
    await window.waitForLoadState('domcontentloaded');

    // Clear localStorage to ensure we're testing fresh
    await window.evaluate(() => {
      localStorage.clear();
    });
  });

  test.afterEach(async () => {
    if (electronApp) {
      // Close all windows first
      const windows = await electronApp.windows();
      await Promise.all(windows.map(win => win.close()));
      // Then close the app
      await electronApp.close().catch(console.error);
    }
  });

  test('can create new account successfully', async () => {
    try {
      // Get the shared test user credentials
      const credentials = getSharedTestUserCredentials();

      // Click on "Don't have an account? Sign Up" link
      const signUpLink = await window.waitForSelector('text="Don\'t have an account? Sign Up"');
      await signUpLink.click();

      // Wait for the registration form to appear
      await window.waitForSelector('h1:has-text("Sign up")');
      
      // Fill in the registration form
      await window.fill('input[name="firstName"]', credentials.firstName);
      await window.fill('input[name="lastName"]', credentials.lastName);
      await window.fill('input[name="username"]', credentials.username);
      await window.fill('input[name="password"]', credentials.password);

      // Submit the registration form
      await window.click('button[type="submit"]');

      // Wait for registration success and redirection to login
      await window.waitForSelector('h1:has-text("Sign in")', { timeout: 10000 });

    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('shows error when registering existing user', async () => {
    try {
      // Use our shared test user credentials to test duplicate registration
      const credentials = getSharedTestUserCredentials();

      // Click on "Don't have an account? Sign Up" link
      const signUpLink = await window.waitForSelector('text="Don\'t have an account? Sign Up"');
      await signUpLink.click();

      // Wait for the registration form to appear
      await window.waitForSelector('h1:has-text("Sign up")');

      // Fill in the registration form with existing user
      await window.fill('input[name="firstName"]', credentials.firstName);
      await window.fill('input[name="lastName"]', credentials.lastName);
      await window.fill('input[name="username"]', credentials.username);
      await window.fill('input[name="password"]', credentials.password);

      // Submit the registration form
      await window.click('button[type="submit"]');

      // Wait for and verify the error message
      const errorMessage = await window.waitForSelector('text="User already exists. Please choose a different username."', {
        timeout: 5000,
        state: 'visible'
      });
      
      // Verify error message is visible
      const isVisible = await errorMessage.isVisible();
      expect(isVisible).toBe(true);

      // Verify we're still on the registration page
      const signUpHeading = await window.textContent('h1');
      expect(signUpHeading).toBe('Sign up');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
}); 
