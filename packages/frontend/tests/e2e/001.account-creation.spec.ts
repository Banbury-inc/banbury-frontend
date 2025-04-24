import { test, expect } from '@playwright/test'
import { 
  generateRandomUsername as _generateRandomUsername, 
  getSharedTestUserCredentials,
  createTestUserIfNeeded as _createTestUserIfNeeded
} from './utils/test-user'
import { getSharedContext } from './utils/test-runner'

test.describe('Account creation tests', () => {
  let sharedContext;

  test.beforeAll(async () => {
    // Get or initialize the shared context
    sharedContext = getSharedContext();
    await sharedContext.initialize();
  });

  test('can create new account successfully', async () => {
    try {
      const window = sharedContext.window;
      if (!window) {
        throw new Error('Window is not initialized');
      }

      // Clear localStorage to ensure we're testing fresh
      await window.evaluate(() => {
        localStorage.clear();
      });

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

  test('clicking on already have an account? sign in link redirects to login page', async () => {
    try {
      const window = sharedContext.window;
      if (!window) {
        throw new Error('Window is not initialized');
      }

      // Click on "Already have an account? Sign in" link
      const signInLink = await window.waitForSelector('text="Already have an account? Sign in"');
      await signInLink.click();

      // Wait for the login form to appear
      await window.waitForSelector('h1:has-text("Sign in")');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
}); 
