import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';
import { platform } from 'os';
import * as path from 'path';

// Platform-specific configurations
const platformConfig = {
  win32: {
    args: ['--no-sandbox'],
    env: {
      NODE_ENV: 'development',
      ELECTRON_ENABLE_LOGGING: '1',
      DEBUG: 'electron*,playwright*'
    }
  },
  darwin: {
    args: [],
    env: {
      NODE_ENV: 'development',
      ELECTRON_ENABLE_LOGGING: '1',
      DEBUG: 'electron*,playwright*'
    }
  },
  linux: {
    env: {
      NODE_ENV: 'development',
      ELECTRON_ENABLE_LOGGING: '1',
      DEBUG: 'electron*,playwright*'
    }
  }
};

const currentPlatform = platform() as 'win32' | 'darwin' | 'linux';

// Get the correct path to the Electron app
const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');

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
