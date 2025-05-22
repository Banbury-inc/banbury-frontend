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

  
  try {

    const credentials = getSharedTestUserCredentials();

    // Wait for redirect to login
    await window.waitForSelector('h1:has-text("Sign in")', { timeout: 10000 });

    // Wait for login form inputs to be visible and enabled
    await window.waitForSelector('input[name="email"]', { state: 'visible', timeout: 10000 });
    await window.waitForSelector('input[name="password"]', { state: 'visible', timeout: 10000 });

    // Optionally, wait a short moment for UI to stabilize (can help with flakiness)
    await window.waitForTimeout(100);

    // Login with the new user using locators (more resilient to re-renders)
    const emailInput = window.locator('input[name="email"]');
    const passwordInput = window.locator('input[name="password"]');

    await emailInput.fill(credentials.username);
    await passwordInput.fill(credentials.password);

    await window.locator('button[type="submit"]').click();

    // Wait for the welcome text to appear in any heading
    const welcomeHeading = await window.waitForSelector('h4:has-text("Welcome to Banbury")', {
      timeout: 30000,
    });

    // Verify the welcome heading is visible
    const isVisible = await welcomeHeading.isVisible();
    expect(isVisible).toBe(true);

    // Additional verification - check for the first step description
    const description = await window.textContent('p.MuiTypography-body1');
    expect(description).toContain("We're excited to have you here!");
    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});
