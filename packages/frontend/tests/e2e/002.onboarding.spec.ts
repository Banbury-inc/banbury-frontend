import { test, expect } from '@playwright/test'
import { 
  createTestUserIfNeeded, 
  loginWithTestUser as _loginWithTestUser,
  TestUserCredentials
} from './utils/test-user'
import { getSharedContext } from './utils/test-runner'

test.describe('Onboarding tests', () => {
  let _testUserCredentials: TestUserCredentials;

  test('can click add and scan device', async () => {
    const sharedContext = getSharedContext();
    const window = sharedContext.window;
    if (!window) {
      throw new Error('Window is not initialized');
    }

    // Navigate to the Add Device step
    const nextButton = await window.waitForSelector('button:has-text("Next")', {
      timeout: 50000
    });
    await nextButton.click();

    // Wait for the Add Device step
    await window.waitForSelector('h4:has-text("Add Device")', {
      timeout: 50000
    });

    // Find and click the Add Device button using the data-testid
    const addDeviceButtonLocator = window.locator('[data-testid="onboarding-add-device-button"]');
    await expect(addDeviceButtonLocator).toBeVisible({ timeout: 5000 });
    await expect(addDeviceButtonLocator).toBeEnabled();
    await addDeviceButtonLocator.click();
    
    // Wait for Scan Device step to load
    await window.waitForSelector('h4:has-text("Scan Device")', {
      timeout: 50000
    });
    
    // Find and click the Scan Device button
    const scanDeviceButtonLocator = window.locator('[data-testid="onboarding-scan-device-button"]');
    await expect(scanDeviceButtonLocator).toBeVisible({ timeout: 5000 });
    await expect(scanDeviceButtonLocator).toBeEnabled();
    await scanDeviceButtonLocator.click();
    
    // Wait for button that says Finish
    const finishButtonLocator = window.locator('[data-testid="onboarding-next-button"]');
    await expect(finishButtonLocator).toBeVisible({ timeout: 5000 });
    await finishButtonLocator.click();
    
    // Verify we completed onboarding
    await window.waitForSelector('[data-testid="main-component"]', {
      timeout: 30000
    });
  });
}); 
