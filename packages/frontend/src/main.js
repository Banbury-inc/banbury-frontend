const { app, BrowserWindow } = require('electron');
const path = require('path');

// Initialize @electron/remote (if you use it)
require('@electron/remote/main').initialize();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // If using a preload script:
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      // Enable remote module support if needed:
      enableRemoteModule: true
    },
  });

  if (process.env.NODE_ENV === 'development') {
    // Load the React dev server in development.
    mainWindow.loadURL('http://localhost:8081');
  } else {
    // In production, load the local HTML file.
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
}); 