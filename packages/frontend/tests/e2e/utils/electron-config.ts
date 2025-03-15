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

export const getElectronConfig = (electronPath: string) => {
  const currentPlatform = platform() as 'win32' | 'darwin' | 'linux';
  
  return {
    args: [electronPath, ...platformConfig[currentPlatform].args],
    env: {
      ...process.env,
      ...platformConfig[currentPlatform].env
    },
    timeout: 30000
  };
}; 