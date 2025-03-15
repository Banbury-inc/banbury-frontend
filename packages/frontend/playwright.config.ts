import type { PlaywrightTestConfig } from '@playwright/test';
import { platform } from 'os';

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
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-dev-shm-usage'
    ],
    env: {
      NODE_ENV: 'development',
      DISPLAY: process.env.DISPLAY || ':99.0',
      ELECTRON_ENABLE_LOGGING: '1',
      DEBUG: 'electron*,playwright*',
      ELECTRON_DISABLE_SANDBOX: '1',
      DISABLE_GPU: '1'
    }
  }
};

const currentPlatform = platform() as 'win32' | 'darwin' | 'linux';
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
  projects: [
    {
      name: 'Electron',
      testMatch: /.*\.spec\.ts/,
      use: {
        // @ts-ignore - Electron types are not properly exposed in Playwright's type definitions
        _electron: {
          ...platformConfig[currentPlatform],
          env: {
            ...process.env,
            ...platformConfig[currentPlatform].env
          }
        }
      }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
};

export default config; 
