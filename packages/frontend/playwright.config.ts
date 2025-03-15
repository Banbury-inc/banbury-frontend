import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';




const config: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  timeout: 180000, // 3 minutes
  retries: 2,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // projects: [
  //   {
  //     name: 'Electron',
  //     testMatch: /.*\.spec\.ts/,
  //     use: {
  //       // @ts-ignore - Electron types are not properly exposed in Playwright's type definitions
  //       _electron: {
  //         ...platformConfig[currentPlatform],
  //         executablePath: electronPath,
  //         env: {
  //           ...process.env,
  //           ...platformConfig[currentPlatform].env,
  //           ELECTRON_ENABLE_SECURITY_WARNINGS: 'false',
  //           ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
  //         }
  //       }
  //     }
  //   }
  // ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
};

export default config; 
