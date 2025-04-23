import { Page } from '@playwright/test';

// Singleton test user credentials
let sharedTestUserCredentials: TestUserCredentials | null = null;

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

// Get or create shared test user credentials
export function getSharedTestUserCredentials(): TestUserCredentials {
  if (!sharedTestUserCredentials) {
    // Create a new shared credentials object
    sharedTestUserCredentials = {
      username: generateRandomUsername(),
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    };

    // sharedTestUserCredentials = {
    //   username: 'mmills',
    //   password: 'dirtballer',
    //   firstName: 'Michael',
    //   lastName: 'Mills'
    // };
  }
  return sharedTestUserCredentials;
}

// Create a new test user account
export async function createTestUser(window: Page): Promise<TestUserCredentials> {
  // Use the shared test user credentials if available
  const credentials = getSharedTestUserCredentials();

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

// Create a test user account only if it doesn't already exist
export async function createTestUserIfNeeded(window: Page): Promise<TestUserCredentials> {
  const credentials = getSharedTestUserCredentials();
  
  try {
    // Try to log in with the credentials first
    await window.fill('input[name="email"]', credentials.username);
    await window.fill('input[name="password"]', credentials.password);
    
    // Click login and wait for response
    await Promise.all([
      window.click('button[type="submit"]'),
      window.waitForResponse(
        response => response.url().includes('/authentication/getuserinfo4'),
        { timeout: 5000 }
      ),
    ]);
    
    // If login is successful, account exists
    return credentials;
  } catch (error) {
    console.warn('Login failed, likely because account doesn\'t exist:', error);
    // Login failed, likely because account doesn't exist
    // So create a new account
    return await createTestUser(window);
  }
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

  // Go through each step of onboarding
  try {
    // Step 1: Welcome to Banbury
    const welcomeStep = await window.waitForSelector('h4:has-text("Welcome to Banbury")', { 
      timeout: 5000 
    }).catch(() => null);
    
    if (welcomeStep) {
      // Click Next on welcome step
      const nextButton = await window.waitForSelector('button:has-text("Next")', { timeout: 3000 });
      await nextButton.click();
      await window.waitForTimeout(500);
    }
    
    // Step 2: Add Device
    const addDeviceStep = await window.waitForSelector('h4:has-text("Add Device")', { 
      timeout: 5000 
    }).catch(() => null);
    
    if (addDeviceStep) {
      // Click the "Add Device" button if it's not already added
      const addDeviceButton = await window.waitForSelector('[data-testid="onboarding-add-device-button"]', {
        timeout: 3000
      }).catch(() => null);
      
      if (addDeviceButton) {
        // Check if it's already been clicked
        const rawButtonText = await addDeviceButton.textContent();
        const buttonText = typeof rawButtonText === 'string' ? rawButtonText : '';
        if (!buttonText.includes('Device Added')) {
          await addDeviceButton.click();
          
          // Wait for device to be added
          await window.waitForFunction(() => {
            const button = document.querySelector('[data-testid="onboarding-add-device-button"]');
            return Boolean(button && button.textContent && button.textContent.includes('Device Added'));
          }, { timeout: 10000 });
        }
      }
      
      // Click Skip & Continue
      const skipButton = await window.waitForSelector('button:has-text("Skip & Continue")', {
        timeout: 3000
      });
      await skipButton.click();
      await window.waitForTimeout(500);
    }
    
    // Step 3: Scan Device
    const scanDeviceStep = await window.waitForSelector('h4:has-text("Scan Device")', { 
      timeout: 5000 
    }).catch(() => null);
    
    if (scanDeviceStep) {
      // Click the "Scan Device" button if it's not already scanned
      const scanDeviceButton = await window.waitForSelector('[data-testid="onboarding-scan-device-button"]', {
        timeout: 3000
      }).catch(() => null);
      
      if (scanDeviceButton) {
        // Check if it's already been clicked
        const rawButtonText = await scanDeviceButton.textContent();
        const buttonText = typeof rawButtonText === 'string' ? rawButtonText : '';
        if (!buttonText.includes('Device Scanned')) {
          await scanDeviceButton.click();
          
          // Wait for scan to complete (with a longer timeout)
          await window.waitForFunction(() => {
            const button = document.querySelector('[data-testid="onboarding-scan-device-button"]');
            return Boolean(button && button.textContent && button.textContent.includes('Device Scanned'));
          }, { timeout: 20000 });
        }
      }
      
      // Click Skip & Continue
      const skipContinueButton = await window.waitForSelector('button:has-text("Skip & Continue")', {
        timeout: 3000
      });
      await skipContinueButton.click();
      await window.waitForTimeout(500);
    }
    
    // Final step
    const finishButton = await window.waitForSelector('button:has-text("Finish")', {
      timeout: 3000
    }).catch(() => null);
    
    if (finishButton) {
      await finishButton.click();
      await window.waitForTimeout(500);
    }
    
  } catch (error) {
    // If something goes wrong with the detailed approach, fall back to the simpler approach
    console.warn('Error in detailed onboarding flow, falling back to simpler approach', error);
    
    // Simplified approach: just click through all steps
    for (let i = 0; i < 4; i++) {
      try {
        if (i < 3) {
          const nextButton = await window.waitForSelector('button:has-text("Next"), button:has-text("Skip & Continue")', {
            timeout: 5000
          });
          await nextButton.click();

          const skipButton = await window.waitForSelector('button:has-text("Skip & Continue")', {
            timeout: 5000
          });
          await skipButton.click();
        } else {
          // On the last step, click Finish
          const finishButton = await window.waitForSelector('button:has-text("Finish")', {
            timeout: 5000
          });
          await finishButton.click();
        }
        // Wait a bit for animations
        await window.waitForTimeout(1000);
      } catch (stepError) {
        console.warn(`Error in step ${i} of simplified onboarding, continuing...`, stepError);
        continue;
      }
    }
  }
  
  // Wait for onboarding to complete and main interface to appear
  await window.waitForSelector('[data-testid="main-component"]', {
    timeout: 30000
  }).catch(() => {
    console.warn('Could not find main component after onboarding');
  });
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
    return Boolean(button && button.textContent && button.textContent.includes('Device Added'));
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
    return Boolean(button && button.textContent && button.textContent.includes('Device Scanned'));
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
  const credentials = await createTestUserIfNeeded(window);
  await loginWithTestUser(window, credentials);
  
  try {
    // Check if onboarding is needed by looking for the onboarding component
    const isOnboardingVisible = await window.waitForSelector('[data-testid="onboarding-component"]', {
      timeout: 10000,
      state: 'visible'
    }).then(() => true).catch(() => false);
    
    // Only complete onboarding if needed
    if (isOnboardingVisible) {
      await completeOnboarding(window);
    }
  } catch (error) {
    console.warn('Error checking for onboarding component:', error);
    // Onboarding may already be completed, which is fine
  }
  
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
        const isConnected = Object.prototype.hasOwnProperty.call(window, 'websocket') && 
                           (window as any).websocket && 
                           (window as any).websocket.readyState === WebSocket.OPEN;
        
        if (isConnected) {
          resolve(true);
        } else {
          // Check again after a short delay
          setTimeout(checkConnection, 100);
        }
      };
      
      // Start checking
      checkConnection();
    });
  });
}

/**
 * Handles the entire authentication flow - ensures a user is created, logged in,
 * and has completed onboarding
 * 
 * @param window - The Playwright Page object
 * @returns Promise<TestUserCredentials> - The credentials of the logged-in user
 */
export async function ensureLoggedInAndOnboarded(window: Page): Promise<TestUserCredentials> {
  // Get or create the credentials
  const credentials = getSharedTestUserCredentials();
  
  // Check if we're already logged in
  const isAlreadyLoggedIn = await window.evaluate(() => {
    return !!localStorage.getItem('accessToken');
  }).catch(() => false);
  
  // If not logged in, we need to log in
  if (!isAlreadyLoggedIn) {
    try {
      // Try to log in with the credentials
      await loginWithTestUser(window, credentials);
    } catch (error) {
      console.warn('Login failed, likely because account doesn\'t exist:', error);
      // If login fails, create user and then log in
      await createTestUser(window);
      await loginWithTestUser(window, credentials);
    }
  }
  
  // Check if we need to complete onboarding
  const isOnboardingVisible = await window.waitForSelector('[data-testid="onboarding-component"]', {
    timeout: 10000,
    state: 'visible'
  }).then(() => true).catch(() => false);
  
  if (isOnboardingVisible) {
    console.warn('Onboarding flow detected, completing it...');
    
    // First check which step of onboarding we're on
    const welcomeStep = await window.waitForSelector('h4:has-text("Welcome to Banbury")', { 
      timeout: 1000 
    }).then(() => true).catch(() => false);
    
    const addDeviceStep = await window.waitForSelector('h4:has-text("Add Device")', { 
      timeout: 1000 
    }).then(() => true).catch(() => false);
    
    const scanDeviceStep = await window.waitForSelector('h4:has-text("Scan Device")', { 
      timeout: 1000 
    }).then(() => true).catch(() => false);
    
    // Handle each step based on where we are
    if (welcomeStep) {
      console.warn('Handling welcome step');
      try {
        // Click Next on welcome step
        const nextButton = await window.waitForSelector('button:has-text("Next")', { timeout: 3000 });
        await nextButton.click();
        await window.waitForTimeout(500);
      } catch (error) {
        console.warn('Error in welcome step, continuing', error);
      }
    }
    
    // Check again for add device step (we might have reached it after welcome)
    const isAddDeviceVisible = await window.waitForSelector('h4:has-text("Add Device")', { 
      timeout: 3000 
    }).then(() => true).catch(() => false);
    
    if (addDeviceStep || isAddDeviceVisible) {
      console.warn('Handling add device step');
      try {
        // Click the "Add Device" button
        const addDeviceButton = await window.waitForSelector('[data-testid="onboarding-add-device-button"]', {
          timeout: 5000
        });
        
        // Check if it's already been clicked
        const rawButtonText = await addDeviceButton.textContent();
        const buttonText = typeof rawButtonText === 'string' ? rawButtonText : '';
        if (!buttonText.includes('Device Added')) {
          await addDeviceButton.click();
          
          // Wait for device to be added with an explicit timeout check
          const startTime = Date.now();
          let deviceAdded = false;
          
          while (Date.now() - startTime < 1000 && !deviceAdded) {
            deviceAdded = await window.evaluate(() => {
              const button = document.querySelector('[data-testid="onboarding-add-device-button"]');
              return Boolean(button && button.textContent && button.textContent.includes('Device Added'));
            });
            
            if (!deviceAdded) {
              await window.waitForTimeout(100);
            }
          }
        }
        
        // Click Skip & Continue
        const skipButton = await window.waitForSelector('button:has-text("Skip & Continue")', {
          timeout: 5000
        });
        await skipButton.click();
        await window.waitForTimeout(500);
      } catch (error) {
        console.warn('Error in add device step, continuing', error);
      }
    }
    
    // Check again for scan device step (we might have reached it after add device)
    const isScanDeviceVisible = await window.waitForSelector('h4:has-text("Scan Device")', { 
      timeout: 3000 
    }).then(() => true).catch(() => false);
    
    if (scanDeviceStep || isScanDeviceVisible) {
      console.warn('Handling scan device step');
      try {
        // Click the "Scan Device" button
        const scanDeviceButton = await window.waitForSelector('[data-testid="onboarding-scan-device-button"]', {
          timeout: 5000
        });
        
        // Check if it's already been clicked
        const rawButtonText = await scanDeviceButton.textContent();
        const buttonText = typeof rawButtonText === 'string' ? rawButtonText : '';
        if (!buttonText.includes('Device Scanned')) {
          await scanDeviceButton.click();
          
          // Wait for the Finish button to be visible
          const finishButton = await window.waitForSelector('button:has-text("Finish")', {
            timeout: 5000
          });
          await finishButton.click();
          await window.waitForTimeout(1000);
        }
      } catch (error) {
        console.warn('Error in scan device step, continuing', error);
      }
    }
    
    // Handle final step
    try {
      const finishButton = await window.waitForSelector('button:has-text("Finish")', {
        timeout: 3000
      });
      await finishButton.click();
      await window.waitForTimeout(1000);
    } catch (error) {
      console.warn('Error in final step, continuing', error);
    }
    
    // If the detailed steps failed, fall back to the completeOnboarding helper
    const isStillOnboarding = await window.waitForSelector('[data-testid="onboarding-component"]', {
      timeout: 3000,
      state: 'visible'
    }).then(() => true).catch(() => false);
    
    if (isStillOnboarding) {
      console.warn('Still on onboarding, using completeOnboarding helper');
      await completeOnboarding(window);
    }
  }
  
  // Wait for the main interface to be visible
  await window.waitForSelector('[data-testid="main-component"]', {
    timeout: 30000
  });
  
  return credentials;
}

/**
 * Dismisses any unexpected dialogs or popups that might appear during tests
 * This is useful for keeping tests running even if unexpected UI elements appear
 * 
 * @param window - The Playwright Page object
 * @returns Promise<boolean> - true if a dialog was dismissed, false otherwise
 */
export async function dismissUnexpectedDialogs(window: Page): Promise<boolean> {
  let dismissed = false;
  
  // Try to find and dismiss various types of dialogs
  try {
    // Check for common dialog/modal elements
    const dialog = await window.waitForSelector(
      '.MuiDialog-root, .MuiModal-root, [role="dialog"], [aria-modal="true"]', 
      { timeout: 2000, state: 'visible' }
    ).catch(() => null);
    
    if (dialog) {
      // Look for dismiss buttons
      const closeButton = await dialog.waitForSelector(
        'button:has-text("Close"), button:has-text("Cancel"), button:has-text("Dismiss"), .MuiDialogTitle-closeButton, [aria-label="close"]',
        { timeout: 1000 }
      ).catch(() => null);
      
      if (closeButton) {
        await closeButton.click();
        dismissed = true;
        console.warn('Dismissed a dialog by clicking close button');
      } else {
        // Try clicking outside the dialog (backdrop)
        const backdrop = await window.waitForSelector('.MuiBackdrop-root', { timeout: 1000 }).catch(() => null);
        if (backdrop) {
          await backdrop.click({ position: { x: 10, y: 10 } });
          dismissed = true;
          console.warn('Dismissed a dialog by clicking backdrop');
        }
      }
    }
    
    // Check for popover elements
    const popover = await window.waitForSelector('.MuiPopover-root, [role="presentation"]', { timeout: 1000, state: 'visible' }).catch(() => null);
    if (popover) {
      // Click outside the popover to dismiss it
      await window.mouse.click(0, 0);
      dismissed = true;
      console.warn('Dismissed a popover by clicking outside');
    }
    
    // Wait a moment for the dialog/popover to fully close
    if (dismissed) {
      await window.waitForTimeout(300);
    }
    
  } catch (error) {
    console.warn('Error trying to dismiss dialogs', error);
  }
  
  return dismissed;
}

/**
 * Wraps a test function with automatic recovery for login/onboarding issues
 * If the test fails due to login or onboarding issues, this will attempt to recover and retry
 * 
 * @param window - The Playwright Page object
 * @param testFn - The test function to execute
 * @returns Promise<void>
 */
export async function wrapWithRecovery(window: Page, testFn: () => Promise<void>): Promise<void> {
  try {
    // Try running the test function
    await testFn();
  } catch (error) {
    console.warn('Test failed, attempting recovery...', error);
    
    // First dismiss any dialogs
    await dismissUnexpectedDialogs(window);
    
    // Check if we need to log in again
    const isLoginVisible = await window.waitForSelector('h1:has-text("Sign in")', {
      timeout: 3000,
      state: 'visible'
    }).then(() => true).catch(() => false);
    
    if (isLoginVisible) {
      console.warn('Login screen detected, logging in again...');
      await ensureLoggedInAndOnboarded(window);
      
      // Retry the test function
      await testFn();
      return;
    }
    
    // Check if we're in onboarding
    const isOnboardingVisible = await window.waitForSelector('[data-testid="onboarding-component"]', {
      timeout: 3000,
      state: 'visible'
    }).then(() => true).catch(() => false);
    
    if (isOnboardingVisible) {
      console.warn('Onboarding screen detected, completing onboarding...');
      await ensureLoggedInAndOnboarded(window);
      
      // Retry the test function
      await testFn();
      return;
    }
    
    // If we can't recover, rethrow the original error
    throw error;
  }
} 
