import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import electronLog from 'electron-log';

export class UpdateService {
    private isSnap: boolean;

    constructor(private mainWindow: BrowserWindow) {
        console.log('Initializing UpdateService');
        this.isSnap = process.env.SNAP !== undefined;

        // Handle IPC messages from renderer
        ipcMain.on('check-for-updates', () => {
            console.log('Received check-for-updates request');
            if (this.isSnap) {
                this.sendStatusToWindow('Updates are handled by Snap store');
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
            console.log('Running in Snap environment - updates will be handled by Snap');
            return;
        }

        // Configure autoUpdater
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.logger = electronLog;
        electronLog.transports.file.level = 'debug';

        // Add this to see the current configuration
        console.log('Update config:', autoUpdater.getFeedURL() || 'No feed URL set');
        console.log('Current version:', autoUpdater.currentVersion);

        // Listen for update events
        autoUpdater.on('checking-for-update', () => {
            console.log('Checking for update...');
            this.sendStatusToWindow('Checking for updates...');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('Update available:', info);
            this.sendStatusToWindow('Update available.');
            this.mainWindow.webContents.send('update-available');
        });

        autoUpdater.on('update-not-available', (info) => {
            console.log('Update not available:', info);
            this.sendStatusToWindow('Update not available.');
            this.mainWindow.webContents.send('update-not-available');
        });

        autoUpdater.on('error', (err) => {
            console.error('Update error:', err);
            console.error('Error details:', err.stack);
            this.sendStatusToWindow(`Error in auto-updater: ${err.message}`);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            this.sendStatusToWindow(
                `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`
            );
        });

        autoUpdater.on('update-downloaded', (info) => {
            this.sendStatusToWindow('Update downloaded; will install on quit');
            this.mainWindow.webContents.send('update-downloaded');
        });
    }

    private sendStatusToWindow(text: string) {
        console.log('Sending status to window:', text);
        this.mainWindow.webContents.send('update-message', text);
    }

    public checkForUpdates() {
        if (this.isSnap) {
            this.sendStatusToWindow('Updates are handled by Snap store');
            return;
        }
        autoUpdater.checkForUpdates();
    }
} 