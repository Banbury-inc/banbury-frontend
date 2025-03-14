import '@testing-library/jest-dom';

// Mock the electron/remote module
jest.mock('@electron/remote', () => ({
  getCurrentWindow: jest.fn(),
  dialog: {
    showOpenDialog: jest.fn(),
  },
}));

// Mock console methods to reduce noise in tests
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
}); 