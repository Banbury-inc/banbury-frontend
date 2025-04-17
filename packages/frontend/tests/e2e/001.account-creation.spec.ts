import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import { getElectronConfig } from './utils/electron-config'
import { generateRandomUsername } from './utils/test-user'

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

    // Click on "Don't have an account? Sign Up" link
    const signUpLink = await window.waitForSelector('text="Don\'t have an account? Sign Up"');
    await signUpLink.click();

    // Wait for the registration form to appear
    await window.waitForSelector('h1:has-text("Sign up")');
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

  test('can create new account and login successfully', async () => {
    try {
      // Generate a random username
      const username = generateRandomUsername();

      // Fill in the registration form
      await window.fill('input[name="firstName"]', 'Test');
      await window.fill('input[name="lastName"]', 'User');
      await window.fill('input[name="username"]', username);
      await window.fill('input[name="password"]', 'testpassword123');

      // Submit the registration form
      await window.click('button[type="submit"]');

      // Wait for registration success and redirection to login
      await window.waitForSelector('h1:has-text("Sign in")', { timeout: 10000 });

      // Fill in the login form with the newly created account
      await window.fill('input[name="email"]', username);
      await window.fill('input[name="password"]', 'testpassword123');

      // Click on the login button and wait for navigation
      await Promise.all([
        window.click('button[type="submit"]'),
        window.waitForResponse(response => response.url().includes('/authentication/getuserinfo4')),
      ]);

      // Wait for the onboarding component to appear
      await window.waitForSelector('[data-testid="onboarding-component"]', {
        timeout: 30000,
        state: 'visible'
      });

      // Verify we're on the first step of onboarding
      const stepLabel = await window.textContent('.MuiStepLabel-label');
      expect(stepLabel).toContain('Welcome to Banbury');

      // Verify the welcome description
      const description = await window.textContent('p.MuiTypography-body1');
      expect(description).toContain("We're excited to have you here!");
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('shows error when registering existing user', async () => {
    try {
      // Use a fixed username that we know exists
      const existingUsername = 'testuser';

      // Fill in the registration form with existing user
      await window.fill('input[name="firstName"]', 'Test');
      await window.fill('input[name="lastName"]', 'User');
      await window.fill('input[name="username"]', existingUsername);
      await window.fill('input[name="password"]', 'testpassword123');

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
