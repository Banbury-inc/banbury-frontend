const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  if (args[0]?.includes?.('Warning: ')) return;
  if (args[0]?.includes?.('DeprecationWarning: ')) return;
  originalConsoleError.call(console, ...args);
};

console.warn = (...args) => {
  if (args[0]?.includes?.('Warning: ')) return;
  if (args[0]?.includes?.('DeprecationWarning: ')) return;
  originalConsoleWarn.call(console, ...args);
}; 