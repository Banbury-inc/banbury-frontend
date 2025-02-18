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
}

// Initialize Ollama service
async function initializeOllama() {
  ollamaService = new OllamaService();
  try {
    await ollamaService.start();
    if (mainWindow) {
      mainWindow.webContents.send('ollama-ready');
    }
  } catch (error: any) {
    console.error('Failed to start Ollama:', error);
    if (mainWindow) {
      mainWindow.webContents.send('ollama-error', error.message);
    }
  }
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    frame: false,
    // backgroundColor: "#23272a",
    backgroundColor: "rgb(33, 33, 33)",
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 12 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: process.env.NODE_ENV !== "production",
      // preload: path.join(__dirname, 'preload.ts')
    },
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
    // This event is triggered when the main window has finished loading
    // Now you can safely execute any code that interacts with the mainWindow
    // initialize_receiver();
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
  await initializeOllama();
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
