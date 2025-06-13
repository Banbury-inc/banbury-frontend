import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import electronLog from 'electron-log';

export class UpdateService {
    private isSnap: boolean;

    constructor(private mainWindow: BrowserWindow) {
        this.isSnap = process.env.SNAP !== undefined;

        // Handle IPC messages from renderer
        ipcMain.on('check-for-updates', () => {
            if (this.isSnap) {
                this.sendStatusToWindow('Updates are handled by Snap store');
                return;
            }
            
            // Check if we're in development mode
            const { app } = require('electron');
            const appName = app.getName();
            
            // Check multiple indicators for development mode
            const isDevEnv = process.env.NODE_ENV === 'development';
            const isDevBuild = appName.includes('dev') || appName.includes('Dev');
            const isRunningFromSource = appName === 'banbury-frontend'; // Running from npm run dev
            
            if (isDevEnv || isDevBuild || isRunningFromSource) {
                this.sendStatusToWindow('Development mode: Update checking is disabled');
                return;
            }
            
            autoUpdater.checkForUpdates().catch(err => {
                console.error('Error checking for updates:', err);
                this.sendStatusToWindow(`Error checking for updates: ${err.message}`);
            });
        });

        ipcMain.on('download-update', () => {
            if (this.isSnap) return;
            autoUpdater.downloadUpdate();
        });

        ipcMain.on('install-update', () => {
            if (this.isSnap) return;
            autoUpdater.quitAndInstall();
        });

        if (this.isSnap) {
            return;
        }

        // Configure autoUpdater for automatic download and install
        autoUpdater.autoDownload = true;  // Automatically download updates
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.logger = electronLog;
        electronLog.transports.file.level = 'debug';
        
        // Check if this is a dev build and configure accordingly
        const { app } = require('electron');
        const appName = app.getName();
        
        // Check multiple indicators for development mode
        const isDevEnv = process.env.NODE_ENV === 'development';
        const isDevBuild = appName.includes('dev') || appName.includes('Dev');
        const isRunningFromSource = appName === 'banbury-frontend'; // Running from npm run dev
        const isDev = isDevEnv || isDevBuild || isRunningFromSource;
        
        if (isDev) {
            autoUpdater.allowPrerelease = true;  // Dev builds should check for pre-releases
        } else {
            autoUpdater.allowPrerelease = false; // Production builds ignore pre-releases
        }

        // Listen for update events
        autoUpdater.on('checking-for-update', () => {
            this.sendStatusToWindow('Checking for updates...');
        });

        autoUpdater.on('update-available', (info) => {
            this.sendStatusToWindow(`Update available: v${info.version}`);
            this.mainWindow.webContents.send('update-available');
            // Update will automatically start downloading due to autoDownload = true
        });

        autoUpdater.on('update-not-available', () => {
            this.sendStatusToWindow('You are running the latest version.');
            this.mainWindow.webContents.send('update-not-available');
        });

        autoUpdater.on('error', (err) => {
            console.error('Update error:', err);
            console.error('Error details:', err.stack);
            this.sendStatusToWindow(`Error in auto-updater: ${err.message}`);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            const message = `Downloading update: ${Math.round(progressObj.percent)}%`;
            this.sendStatusToWindow(message);
        });

        autoUpdater.on('update-downloaded', (info) => {
            this.sendStatusToWindow(`Update v${info.version} downloaded. Restart to install.`);
            this.mainWindow.webContents.send('update-downloaded');
            
            // Show a notification that update is ready to install
            this.showUpdateReadyNotification(info.version);
        });
    }

    private sendStatusToWindow(text: string) {
        this.mainWindow.webContents.send('update-message', text);
    }

    private showUpdateReadyNotification(version: string) {
        // Send a more prominent notification to the renderer
        this.mainWindow.webContents.send('show-alert', {
            title: 'Update Ready',
            messages: [
                `Version ${version} has been downloaded and is ready to install.`,
                'The update will be installed when you restart the application.'
            ],
            variant: 'info'
        });
    }

    public checkForUpdates() {
        if (this.isSnap) {
            this.sendStatusToWindow('Updates are handled by Snap store');
            return;
        }
        autoUpdater.checkForUpdates();
    }
} 
