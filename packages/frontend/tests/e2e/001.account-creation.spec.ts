import { test, expect } from '@playwright/test'
import { 
  generateRandomUsername as _generateRandomUsername, 
  getSharedTestUserCredentials,
  createTestUserIfNeeded as _createTestUserIfNeeded
} from './utils/test-user'
import { getSharedContext } from './utils/test-runner'
import fs from 'fs';
import os from 'os';
import path from 'path';

test.describe('Account creation tests', () => {
  let sharedContext;

  test.beforeAll(async () => {
    // Get or initialize the shared context
    sharedContext = getSharedContext();
    await sharedContext.initialize();

    // Remove persisted auth files in ~/.banbury
    const banburyDir = path.join(os.homedir(), '.banbury');
    if (fs.existsSync(banburyDir)) {
      for (const file of ['token', 'username', 'api_key']) {
        const filePath = path.join(banburyDir, file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
  });

  test.beforeEach(async () => {
    const window = sharedContext.window;
    if (window) {
      await window.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
    // Remove persisted auth files in ~/.banbury
    const banburyDir = path.join(os.homedir(), '.banbury');
    if (fs.existsSync(banburyDir)) {
      for (const file of ['token', 'username', 'api_key']) {
        const filePath = path.join(banburyDir, file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    // Reset global axios auth token (Node.js/global state)
    const { setGlobalAxiosAuthToken } = require('@banbury/core/dist/middleware');
    setGlobalAxiosAuthToken('');
  });

  test('can create new account successfully', async () => {
    try {
      const window = sharedContext.window;
      if (!window) {
        throw new Error('Window is not initialized');
      }

      // Generate a unique username for this test run
      const credentials = {
        firstName: 'Test',
        lastName: 'User',
        username: `testuser_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        password: 'testpassword123'
      };

      // Go to sign up
      const signUpLink = await window.waitForSelector('text="Don\'t have an account? Sign Up"');
      await signUpLink.click();

      await window.waitForSelector('text="Sign up"');
      await window.fill('input[name="firstName"]', credentials.firstName);
      await window.fill('input[name="lastName"]', credentials.lastName);
      await window.fill('input[name="username"]', credentials.username);
      await window.fill('input[name="password"]', credentials.password);

      await window.click('button[type="submit"]');
      await window.waitForSelector('text="Sign in"', { timeout: 10000 });

      // Optionally, try logging in with the new credentials to verify
      await window.fill('input[name="email"]', credentials.username);
      await window.fill('input[name="password"]', credentials.password);
      await window.click('button[type="submit"]');
      // You can add assertions for successful login here if needed

    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('shows error when registering existing user', async () => {
    try {
      const window = sharedContext.window;
      if (!window) {
        throw new Error('Window is not initialized');
      }

      // Use our shared test user credentials to test duplicate registration
      const credentials = getSharedTestUserCredentials();

      // Click on "Don't have an account? Sign Up" link
      const signUpLink = await window.waitForSelector('text="Don\'t have an account? Sign Up"');
      await signUpLink.click();

      // Wait for the registration form to appear
      await window.waitForSelector('text="Sign up"');

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
      const signUpHeading = await window.textContent('text="Sign up"');
      expect(signUpHeading).toBe('Sign up');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
}); 
