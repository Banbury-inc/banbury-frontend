import * as path from "path";
import * as url from "url";
import axios from 'axios'; // Adjusted import for axios
import { BrowserWindow, app, ipcMain } from "electron";
import { UpdateService } from './update-service';
import { OllamaService } from './ollama-service';


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
        return {
          success: false,
          error: 'Ollama service is not initialized. Please restart the application and try again.'
        };
      }

      if (!modelName) {
        return {
          success: false,
          error: 'Model name is required'
        };
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
      webSecurity: false,
      allowRunningInsecureContent: true,
      webgl: true,
    },
  });

  try {
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
  } catch (error) {
    if (mainWindow) {
      mainWindow.webContents.send('show-alert', {
        title: 'Startup Error',
        messages: [(error as Error).message || 'Failed to start the application'],
        variant: 'error'
      });
    }
    throw error; // Re-throw to ensure the error is logged by Electron
  }
}

// Add helper function to wait for webpack dev server
async function waitForWebpackReady(url: string): Promise<void> {
  const maxAttempts = 30; // Maximum number of attempts (30 * 200ms = 6 seconds)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      await axios.get(url);
      return; // Successfully connected
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to connect to webpack dev server at ${url} after ${maxAttempts} attempts`);
      }
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
