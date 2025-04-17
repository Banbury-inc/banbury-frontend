import { Page, BrowserContext } from '@playwright/test';

// Function to generate a random username
export function generateRandomUsername(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `test_${result}`;
}

export interface TestUserCredentials {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Create a new test user account
export async function createTestUser(window: Page): Promise<TestUserCredentials> {
  // Generate test user credentials
  const credentials: TestUserCredentials = {
    username: generateRandomUsername(),
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'User'
  };

  // Clear localStorage to ensure a fresh start
  await window.evaluate(() => {
    localStorage.clear();
  });

  // Go to the sign-up page
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

  return credentials;
}

// Log in with a test user
export async function loginWithTestUser(window: Page, credentials: TestUserCredentials): Promise<void> {
  // Fill in the login form
  await window.fill('input[name="email"]', credentials.username);
  await window.fill('input[name="password"]', credentials.password);
  
  // Click login and wait for response
  await Promise.all([
    window.click('button[type="submit"]'),
    window.waitForResponse(response => response.url().includes('/authentication/getuserinfo4')),
  ]);
}

// Complete the onboarding process for a new user
export async function completeOnboarding(window: Page): Promise<void> {
  // Wait for the onboarding component to appear
  await window.waitForSelector('[data-testid="onboarding-component"]', {
    timeout: 30000,
    state: 'visible'
  });

  // Click through onboarding steps
  for (let i = 0; i < 4; i++) {
    // If not the last step, click Next/Skip & Continue
    if (i < 3) {
      const nextButton = await window.waitForSelector('button:has-text("Next"), button:has-text("Skip & Continue")', {
        timeout: 5000
      });
      await nextButton.click();
    } else {
      // On the last step, click Finish
      const finishButton = await window.waitForSelector('button:has-text("Finish")', {
        timeout: 5000
      });
      await finishButton.click();
    }
    // Wait a bit for animations
    await window.waitForTimeout(1000);
  }
}

// Interact with onboarding flow to add a device
export async function addDeviceDuringOnboarding(window: Page): Promise<void> {
  // Wait for the onboarding component to appear
  await window.waitForSelector('[data-testid="onboarding-component"]', {
    timeout: 30000,
    state: 'visible'
  });

  // Wait for the first step to be visible
  await window.waitForSelector('h4:has-text("Welcome to Banbury")', {
    timeout: 5000
  });

  // Click Next to move to the second step
  const nextButton = await window.waitForSelector('button:has-text("Next")', {
    timeout: 5000
  });
  await nextButton.click();
  await window.waitForTimeout(1000);

  // Verify we're on the "Add Device" step
  await window.waitForSelector('h4:has-text("Add Device")', {
    timeout: 5000
  });

  // Click the "Add Device" button using the specific data-testid
  const addDeviceButton = await window.waitForSelector('[data-testid="onboarding-add-device-button"]', {
    timeout: 5000
  });
  await addDeviceButton.click();

  // Wait for the device to be added (button should change text to "Device Added")
  await window.waitForFunction(() => {
    const button = document.querySelector('[data-testid="onboarding-add-device-button"]');
    return button && button.textContent && button.textContent.includes('Device Added');
  }, { timeout: 10000 });

  // Continue with onboarding - click "Skip & Continue"
  const skipButton = await window.waitForSelector('button:has-text("Skip & Continue")', {
    timeout: 5000
  });
  await skipButton.click();
  await window.waitForTimeout(1000);

  // Verify we've moved to the next step (Scan Device)
  await window.waitForSelector('h4:has-text("Scan Device")', {
    timeout: 5000
  });
  
  // Verify the scan device button is visible
  await window.waitForSelector('[data-testid="onboarding-scan-device-button"]', {
    timeout: 5000
  });
}

// Interact with onboarding flow to scan files
export async function scanFilesDuringOnboarding(window: Page): Promise<void> {
  // Wait for the onboarding component to appear
  await window.waitForSelector('[data-testid="onboarding-component"]', {
    timeout: 30000,
    state: 'visible'
  });

  // Navigate to the "Scan Device" step (step 3)
  // Step 1: Welcome
  await window.waitForSelector('h4:has-text("Welcome to Banbury")', {
    timeout: 5000
  });
  
  const nextButton1 = await window.waitForSelector('button:has-text("Next")', {
    timeout: 5000
  });
  await nextButton1.click();
  await window.waitForTimeout(1000);

  // Step 2: Add Device
  await window.waitForSelector('h4:has-text("Add Device")', {
    timeout: 5000
  });
  
  const skipButton = await window.waitForSelector('button:has-text("Skip & Continue")', {
    timeout: 5000
  });
  await skipButton.click();
  await window.waitForTimeout(1000);

  // Now we should be at the "Scan Device" step
  await window.waitForSelector('h4:has-text("Scan Device")', {
    timeout: 5000
  });

  // Click the "Scan Device" button using the specific data-testid
  const scanDeviceButton = await window.waitForSelector('[data-testid="onboarding-scan-device-button"]', {
    timeout: 5000
  });
  await scanDeviceButton.click();

  // Wait for the device to be scanned (button should change text to "Device Scanned")
  await window.waitForFunction(() => {
    const button = document.querySelector('[data-testid="onboarding-scan-device-button"]');
    return button && button.textContent && button.textContent.includes('Device Scanned');
  }, { timeout: 15000 });

  // Continue with onboarding - move to next step
  const skipContinueButton = await window.waitForSelector('button:has-text("Skip & Continue")', {
    timeout: 5000
  });
  await skipContinueButton.click();
  await window.waitForTimeout(1000);

  // Final step
  const finishButton = await window.waitForSelector('button:has-text("Finish")', {
    timeout: 5000
  });
  await finishButton.click();
  await window.waitForTimeout(1000);
}

// Setup a complete test user (create, login, and complete onboarding)
export async function setupTestUser(window: Page): Promise<TestUserCredentials> {
  const credentials = await createTestUser(window);
  await loginWithTestUser(window, credentials);
  await completeOnboarding(window);
  return credentials;
}

// Wait for the WebSocket connection to be established
export async function waitForWebsocketConnection(window: Page): Promise<boolean> {
  return await window.evaluate(() => {
    return new Promise<boolean>((resolve) => {
      const maxWaitTime = 10000; // 10 seconds timeout
      const startTime = Date.now();
      
      const checkConnection = () => {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > maxWaitTime) {
          console.warn('WebSocket connection timeout, proceeding anyway');
          resolve(false);
          return;
        }
        
        // Check if the websocket exists and is connected
        const isConnected = window.hasOwnProperty('websocket') && 
                           (window as any).websocket && 
                           (window as any).websocket.readyState === WebSocket.OPEN;
        
        if (isConnected) {
          resolve(true);
        } else {
          // Check again after a short delay
          setTimeout(checkConnection, 100);
        }
      };
      
      checkConnection();
    });
  });
} 