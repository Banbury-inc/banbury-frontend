import { test, expect } from '@playwright/test'
import { createTestUserIfNeeded, loginWithTestUser as _loginWithTestUser, completeOnboarding as _completeOnboarding, TestUserCredentials } from './utils/test-user'
import { getSharedContext } from './utils/test-runner'

test('can login and shows onboarding for first-time user', async () => {
  const sharedContext = getSharedContext();
  let testUserCredentials: TestUserCredentials;
  
  try {
    // Get the window from shared context
    const window = sharedContext.window;
    if (!window) {
      throw new Error('Window is not initialized');
    }
    
    // Clear localStorage to ensure we're testing first-time login
    await window.evaluate(() => {
      localStorage.clear();
    });

    // Get or create a test user with the shared credentials
    testUserCredentials = await createTestUserIfNeeded(window);

    // Type in the username and password
    await window.fill('input[name="email"]', testUserCredentials.username);
    await window.fill('input[name="password"]', testUserCredentials.password);

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
