import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import { getElectronConfig } from './utils/electron-config'
import { 
  createTestUserIfNeeded, 
  loginWithTestUser as _loginWithTestUser,
  TestUserCredentials
} from './utils/test-user'

test.describe('Onboarding tests', () => {
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
    
    // Get or create a single test user for all tests
    _testUserCredentials = await createTestUserIfNeeded(window);
  });

  test.afterAll(async () => {
    if (electronApp) {
      const windows = await electronApp.windows();
      await Promise.all(windows.map(win => win.close()));
      await electronApp.close();
    }
  });

  test('can click add and scan device', async () => {


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
