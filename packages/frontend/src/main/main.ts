import * as path from "path";
import * as url from "url";
import axios from 'axios'; // Adjusted import for axios
import { BrowserWindow, app, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import { shell } from "electron";
import { UpdateService } from './update-service';
import { OllamaService } from './ollama-service';

const fs = require('fs').promises;

let mainWindow: BrowserWindow | null;
let ollamaService: OllamaService;

// Register all IPC handlers before creating the window
function registerIpcHandlers() {
  ipcMain.handle('get-ollama-status', async () => {
    try {
      const response = await fetch('http://localhost:11434/api/version');
      const data = await response.json();
      return { status: 'running', version: data.version };
    } catch {
      return { status: 'stopped' };
    }
  });

  ipcMain.handle('restart-ollama', async () => {
    try {
      ollamaService.stop();
      await ollamaService.start();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-selected-model', async () => {
    return ollamaService.getSelectedModel();
  });

  ipcMain.handle('set-selected-model', async (_event, modelName: string) => {
    await ollamaService.setSelectedModel(modelName);
    return { success: true };
  });

  ipcMain.handle('download-ollama-model', async (_event, modelName: string) => {
    try {
      if (!ollamaService) {
        throw new Error('Ollama service is not initialized');
      }

      await ollamaService.downloadModel(modelName, (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('ollama-model-progress', { 
            modelName, 
            progress 
          });
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error downloading model:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to download model' 
      };
    }
  });

  ipcMain.on('fetch-data', async (event) => {
    try {
      const response = await axios.get('https://catfact.ninja/fact');
      event.reply('fetch-data-response', response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  });

  ipcMain.on('show-alert', (_event, alertData) => {
    if (mainWindow) {
      mainWindow.webContents.send('show-alert', alertData);
    }
  });
}

// Initialize Ollama service
async function initializeOllama() {
  if (!mainWindow) return;
  
  ollamaService = new OllamaService(mainWindow);
  try {
    await ollamaService.start();
    mainWindow.webContents.send('ollama-ready');
  } catch (error: any) {
    mainWindow.webContents.send('show-alert', {
      title: 'Ollama Error',
      messages: [error.message],
      variant: 'error'
    });
  }
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    frame: false,
    backgroundColor: "rgb(33, 33, 33)",
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 12 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: process.env.NODE_ENV !== "production",
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Set CSP headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' http://localhost:* https://localhost:* http://0.0.0.0:* http://*.banbury.io https://*.banbury.io ws://*.banbury.io wss://*.banbury.io;",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
          "style-src 'self' 'unsafe-inline';",
          "img-src 'self' data: https: http:;",
          "connect-src 'self' http://localhost:* https://localhost:* ws://localhost:* wss://localhost:* http://0.0.0.0:* ws://0.0.0.0:* http://*.banbury.io https://*.banbury.io ws://*.banbury.io wss://*.banbury.io http://www.api.dev.banbury.io https://www.api.dev.banbury.io https://httpbin.org;"
        ].join(' ')
      }
    });
  });

  if (process.env.NODE_ENV === "development") {
    await waitForWebpackReady("http://localhost:8081");
    mainWindow.loadURL("http://localhost:8081");
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, "renderer/index.html"),
        protocol: "file:",
        slashes: true,
      })
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Initialize services after window is ready
    initializeOllama();
  });

  const updateService = new UpdateService(mainWindow);

  // Check for updates when app starts
  updateService.checkForUpdates();
}

// Add helper function to wait for webpack dev server
async function waitForWebpackReady(url: string): Promise<void> {
  const axios = require('axios');
  while (true) {
    try {
      await axios.get(url);
      break;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
}

app.whenReady().then(async () => {
  // Register IPC handlers first
  registerIpcHandlers();
  
  // Then initialize services and create window
  await createWindow();
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    ollamaService?.stop();
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion();
});
