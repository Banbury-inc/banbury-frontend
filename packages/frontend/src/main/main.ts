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

// Add IPC handlers for Ollama status
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

ipcMain.on('fetch-data', async (event) => {
  try {
    const response = await axios.get('https://catfact.ninja/fact');
    event.reply('fetch-data-response', response.data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
});

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', () => {
  // Start downloading the update
  autoUpdater.downloadUpdate();

  dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: 'A new update is available. It will be downloaded in the background.',
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', progressObj.percent);
  }
});

autoUpdater.on('error', (err) => {
  dialog.showErrorBox('Error', 'Error during update: ' + err);
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update ready',
    message: 'A new update has been downloaded. Would you like to install it now?',
    buttons: ['Yes', 'Later']
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall(true, true);
    }
  });
});

ipcMain.on('update-username', (_event, username) => {
  let GlobalUsername: string | null = null;
  GlobalUsername = username;
  console.log('Updated username:', GlobalUsername);
});

// Handle 'open-file' event from Renderer process
ipcMain.on('open-file', async (_event, filePath) => {
  try {
    // Example: Check if file exists and open it
    const fileExists = await fs.access(filePath);
    if (fileExists) {
      // Perform actions with the file here, e.g., open it
      // Example: Open file dialog
      shell.openPath(filePath);
    } else {
      dialog.showErrorBox('Error', `File '${filePath}' not found.`);
    }
  } catch (error) {
    dialog.showErrorBox('Error', `Error accessing file '${filePath}. Error: ${error}`);
  }
});

app.whenReady().then(async () => {
  await createWindow();
  await initializeOllama();
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
