import { test, expect } from '@playwright/test'
import { loginWithTestUser as _loginWithTestUser, completeOnboarding as _completeOnboarding, getSharedTestUserCredentials } from './utils/test-user'
import { getSharedContext } from './utils/test-runner'

let sharedContext;

test.beforeEach(async () => {
  sharedContext = getSharedContext();
  await sharedContext.initialize();
});

test('can login and shows onboarding for first-time user', async () => {
  const window = sharedContext.window;
  if (!window) {
    throw new Error('Window is not initialized');
  }

  // Clear localStorage to ensure we're testing first-time login
  await window.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Use our shared test user credentials to test login
  const credentials = getSharedTestUserCredentials();

  await window.waitForSelector('text="Sign in"');
  await window.fill('input[name="email"]', credentials.username);
  await window.fill('input[name="password"]', credentials.password);
  await window.click('button[type="submit"]');

  
  try {

    // Wait for the welcome text to appear in any heading
    const welcomeHeading = await window.waitForSelector('text="Welcome to Banbury"', {
      timeout: 30000,
    });

    // Verify the welcome heading is visible
    const isVisible = await welcomeHeading.isVisible();
    expect(isVisible).toBe(true);

    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});
