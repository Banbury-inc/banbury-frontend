import { _electron as electron, Page } from '@playwright/test';
import * as path from 'path';
import { getElectronConfig } from './electron-config';

// Singleton pattern to share the electron app and window across test files
export class SharedTestContext {
  private static instance: SharedTestContext;
  public electronApp: any = null;
  public window: Page | null = null;
  public isInitialized = false;

  private constructor() {}

  public static getInstance(): SharedTestContext {
    if (!SharedTestContext.instance) {
      SharedTestContext.instance = new SharedTestContext();
    }
    return SharedTestContext.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get the correct path to the Electron app
      const electronPath = path.resolve(__dirname, '../../../');
      
      // Launch Electron app with shared configuration
      this.electronApp = await electron.launch(getElectronConfig(electronPath))
        .catch(async (error) => {
          console.error('Failed to launch electron:', error);
          throw error;
        });

      // Wait for app to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      const isPackaged = await this.electronApp.evaluate(async ({ app }) => {
        return app.isPackaged;
      });

      // Wait for the first BrowserWindow to open
      this.window = await this.electronApp.firstWindow();
      
      // Ensure the window is loaded
      if (this.window) {
        await this.window.waitForLoadState('domcontentloaded');

        // Clear localStorage to ensure we're testing fresh
        await this.window.evaluate(() => {
          localStorage.clear();
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize shared test context:', error);
      throw error;
    }
  }

  public async teardown(): Promise<void> {
    if (this.electronApp) {
      try {
        // Close all windows first
        const windows = await this.electronApp.windows();
        await Promise.all(windows.map(win => win.close()));
        // Then close the app
        await this.electronApp.close().catch(console.error);
        this.window = null;
        this.electronApp = null;
        this.isInitialized = false;
      } catch (error) {
        console.error('Error during teardown:', error);
      }
    }
  }
}

// Export convenience methods
export const getSharedContext = () => SharedTestContext.getInstance(); 