import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';
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
    args: ['--no-sandbox'],
    env: {
      NODE_ENV: 'development',
      DISPLAY: process.env.DISPLAY || ':99',
      ELECTRON_ENABLE_LOGGING: '1',
      DEBUG: 'electron*,playwright*'
    }
  }
};

const currentPlatform = platform() as 'win32' | 'darwin' | 'linux';

const config: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  timeout: 180000, // 3 minutes
  retries: 2,
  workers: 1,
  reporter: [['html', { outputFolder: './tests/playwright-report' }], ['list']],
  outputDir: './tests/test-results',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      env: {
        ...process.env,
        DISPLAY: process.env.DISPLAY || ':99'
      }
    }
  },
  projects: [
    {
      name: 'electron',
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
    },
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
    command: process.platform === 'linux' ? 
      'xvfb-run --auto-servernum --server-args="-screen 0 1024x768x24" npm run dev' : 
      'npm run dev',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
};

export default config; 
