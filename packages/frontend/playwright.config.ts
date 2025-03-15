import { defineConfig } from '@playwright/test';
import { platform } from 'os';

// Platform-specific configuration
const platformConfig = {
  // Slower execution on CI or Windows to improve stability
  slowMo: process.env.CI || platform() === 'win32' ? 200 : 100,
  // Additional args for different platforms
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    // Add Windows-specific args if needed
    ...(platform() === 'win32' ? ['--disable-gpu'] : []),
  ]
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 180000, // Global timeout
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 60000,
    actionTimeout: 30000,
    video: 'retain-on-failure',
    launchOptions: platformConfig,
  },
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.spec\.ts/,
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
}); 
