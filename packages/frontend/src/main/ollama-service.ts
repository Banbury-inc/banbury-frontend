import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { spawn, ChildProcess, exec } from 'child_process';
import * as os from 'os';
import * as net from 'net';
import axios from 'axios';
import { useAlert } from '../renderer/context/AlertContext';

interface DownloadProgress {
  totalParts: number;
  currentPart: number;
  totalSize: number;
  downloadedSize: number;
  startTime: number;
  lastUpdateTime: number;
  speed: number; // bytes per second
}

export class OllamaService {
  private ollamaProcess: ChildProcess | null = null;
  private readonly ollamaPath: string;
  private isStarting: boolean = false;
  private readonly port: number = 11434;
  private isSystemOllama: boolean = false;
  private readonly configPath: string;
  private mainWindow: BrowserWindow | null = null;

  constructor(window?: BrowserWindow) {
    this.ollamaPath = path.join(app.getPath('userData'), 'ollama');
    this.configPath = path.join(app.getPath('userData'), 'ollama-config.json');
    this.mainWindow = window || null;
    this.ensureOllamaDirectory();
  }

  private ensureOllamaDirectory() {
    if (!fs.existsSync(this.ollamaPath)) {
      fs.mkdirSync(this.ollamaPath, { recursive: true });
    }
  }

  private async isOllamaInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('which ollama', (error, stdout) => {
        resolve(!error && stdout.trim().length > 0);
      });
    });
  }

  private getOllamaBinaryUrl(): string {
    const platform = os.platform();
    const arch = os.arch();

    // Define the latest version - you might want to make this configurable
    const version = '0.5.13';

    switch (platform) {
      case 'darwin':
        return `https://github.com/ollama/ollama/releases/download/v${version}/ollama-darwin-${arch}`;
      case 'linux':
        return `https://github.com/ollama/ollama/releases/download/v${version}/ollama-linux-${arch}`;
      case 'win32':
        return `https://github.com/ollama/ollama/releases/download/v${version}/ollama-windows-${arch}.exe`;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private getBinaryPath(): string {
    const platform = os.platform();
    if (platform === 'linux') {
      // Assuming the binary is installed in /usr/local/bin after using the curl command
      return '/usr/local/bin/ollama';
    }
    const binaryName = platform === 'win32' ? 'ollama.exe' : 'ollama';
    return path.join(this.ollamaPath, binaryName);
  }

  private sendError(title: string, message: string, variant: 'error' | 'warning' = 'error') {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('show-alert', {
        title,
        messages: [message],
        variant
      });
    }
  }

  private async validateBinary(binaryPath: string): Promise<boolean> {
    try {
      fs.accessSync(binaryPath, fs.constants.X_OK);
      const header = Buffer.alloc(4);
      const fd = fs.openSync(binaryPath, 'r');
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);

      if (header[0] === 0x7F && header[1] === 0x45 && header[2] === 0x4C && header[3] === 0x46) {
        return true;
      }
      if (header.readUInt32BE(0) === 0xFEEDFACE || header.readUInt32BE(0) === 0xFEEDFACF) {
        return true;
      }
      this.sendError('Binary Validation Failed', 'Invalid binary format');
      return false;
    } catch (error) {
      this.sendError('Binary Validation Error', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  private async downloadOllama(): Promise<void> {
    const platform = os.platform();

    if (platform === 'linux') {
      await this.installOllamaLinux();
      return;
    }

    const binaryPath = this.getBinaryPath();
    const downloadUrl = this.getOllamaBinaryUrl();
    if (fs.existsSync(binaryPath)) {
      fs.unlinkSync(binaryPath);
    }

    return new Promise((resolve, reject) => {
      const handleResponse = (response: any) => {
        if (response.statusCode !== 200) {
          const error = `Failed to download: ${response.statusCode} ${response.statusMessage}`;
          this.sendError('Download Failed', error);
          reject(new Error(error));
          return;
        }

        const fileStream = fs.createWriteStream(binaryPath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          try {
            fs.chmodSync(binaryPath, 0o755);
            if (!this.validateBinary(binaryPath)) {
              fs.unlinkSync(binaryPath);
              const error = 'Downloaded binary validation failed';
              this.sendError('Validation Error', error);
              reject(new Error(error));
              return;
            }
            resolve();
          } catch (error) {
            const errorMsg = `Failed to process binary: ${error}`;
            this.sendError('Binary Processing Error', errorMsg);
            reject(new Error(errorMsg));
          }
        });

        fileStream.on('error', (error) => {
          fs.unlinkSync(binaryPath);
          this.sendError('File Write Error', error.message);
          reject(new Error(`Failed to write binary: ${error}`));
        });
      };

      https.get(downloadUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          https.get(response.headers.location!, handleResponse)
            .on('error', (error) => {
              this.sendError('Download Error', error.message);
              reject(error);
            });
        } else {
          handleResponse(response);
        }
      }).on('error', (error) => {
        this.sendError('Network Error', error.message);
        reject(error);
      });
    });
  }

  private async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => {
        resolve(true);
      });
      server.once('listening', () => {
        server.close();
        resolve(false);
      });
      server.listen(port, '127.0.0.1');
    });
  }

  private async killExistingOllama(): Promise<void> {
    return new Promise((resolve) => {
      switch (process.platform) {
        case 'win32':
          exec('taskkill /F /IM ollama.exe', () => resolve());
          break;
        case 'darwin': // macOS
          // First try normal kill
          exec('pkill ollama', () => {
            // If that doesn't work, try force kill
            exec('pkill -9 ollama', () => {
              // Cleanup any leftover files
              exec('rm -f /tmp/ollama.sock', () => resolve());
            });
          });
          break;
        case 'linux':
          exec('pkill ollama', () => {
            exec('pkill -9 ollama', () => {
              exec('rm -f /tmp/ollama.sock /tmp/.ollama.lock', () => resolve());
            });
          });
          break;
        default:
          resolve();
      }
    });
  }

  private async waitForPortToBeAvailable(maxAttempts: number = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const inUse = await this.isPortInUse(this.port);
      if (!inUse) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Port ${this.port} is still in use after ${maxAttempts} seconds`);
  }

  private async checkOllamaAPI(): Promise<boolean> {
    try {
      const response = await axios.get('http://localhost:11434/api/version', {
        timeout: 5000
      });

      if (response.status === 200) {
        return true;
      }
      return false;
    } catch (error) {
      if (error instanceof Error) {
        return false;
      }
      return false;
    }
  }

  private async waitForOllamaStart(): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Check if process is still running first
        if (this.ollamaProcess && this.ollamaProcess.exitCode !== null) {
          const error = new Error(`Ollama process exited with code ${this.ollamaProcess.exitCode}`);
          throw error;
        }

        const isResponsive = await this.checkOllamaAPI();
        if (isResponsive) {
          this.isStarting = false;
          return;
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        if (error instanceof Error && error.message.includes('process exited')) {
          this.isStarting = false;
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    this.isStarting = false;
    throw new Error('Ollama failed to become responsive within the timeout period');
  }

  public async start(): Promise<void> {
    if (this.ollamaProcess || this.isStarting) {
      return;
    }

    this.isStarting = true;

    try {
      // First check if Ollama is already running and responding
      for (let i = 0; i < 3; i++) {
        this.isSystemOllama = true;
        this.isStarting = false;
        return;
      }


      // Check if Ollama is installed on the system
      const systemOllama = await this.isOllamaInstalled();

      let ollamaBinaryPath: string;
      if (systemOllama) {
        const result = await new Promise<string>((resolve, reject) => {
          exec('which ollama', (error, stdout) => {
            if (error) reject(error);
            else resolve(stdout.trim());
          });
        });
        ollamaBinaryPath = result;
      } else {
        ollamaBinaryPath = this.getBinaryPath();
        if (!fs.existsSync(ollamaBinaryPath) || !this.validateBinary(ollamaBinaryPath)) {
          await this.downloadOllama();
        }
        ollamaBinaryPath = this.getBinaryPath();
      }

      // Always try to clean up any existing processes and ports
      await this.killExistingOllama();
      await this.waitForPortToBeAvailable();

      // Start Ollama process
      this.ollamaProcess = spawn(ollamaBinaryPath, ['serve'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          HOME: os.homedir(),
          PATH: process.env.PATH,
          XDG_DATA_HOME: path.join(os.homedir(), '.local/share'),
          OLLAMA_HOST: 'localhost',
          OLLAMA_ORIGINS: '*'
        },
        detached: false
      });

      this.ollamaProcess.stdout?.on('data', () => {
      });

      this.ollamaProcess.stderr?.on('data', (data) => {
        const errorMsg = data.toString().trim();
        if (errorMsg.includes('bind: address already in use')) {
          this.sendError('Port In Use', 'Ollama port is already in use by another process', 'warning');
          this.isSystemOllama = true;
        }
      });

      this.ollamaProcess.on('error', (error) => {
        this.sendError('Process Error', `Failed to start Ollama process: ${error.message}`);
        this.isStarting = false;
        this.ollamaProcess = null;
      });

      this.ollamaProcess.on('close', (code, signal) => {
        if (code !== 0) {
          this.sendError('Process Closed', `Ollama process exited with code ${code} and signal ${signal}`);
        }
        this.ollamaProcess = null;
        this.isStarting = false;
      });

      // Give the process a moment to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Wait for Ollama to be responsive
      await this.waitForOllamaStart();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.sendError('Startup Error', `Error during Ollama startup: ${errorMsg}`);
      this.isStarting = false;
      if (this.ollamaProcess) {
        this.ollamaProcess.kill();
        this.ollamaProcess = null;
      }
      throw error;
    }
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*([KMGT]?B)/i);
    if (!match) return 0;

    const [, value, unit] = match;
    const multipliers: { [key: string]: number } = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };

    return parseFloat(value) * (multipliers[unit.toUpperCase()] || 1);
  }

  public async downloadModel(modelName: string, onProgress?: (progress: string) => void): Promise<void> {
    const isResponsive = await this.checkOllamaAPI();
    if (!isResponsive) {
      await this.start();

      const isNowResponsive = await this.checkOllamaAPI();
      if (!isNowResponsive) {
        this.sendError('Service Error', 'Ollama service failed to start');
        throw new Error('Ollama service failed to start');
      }
    }

    try {
      const response = await axios.post('http://localhost:11434/api/pull',
        { name: modelName },
        {
          responseType: 'stream',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const progress: DownloadProgress = {
        totalParts: 0,
        currentPart: 0,
        totalSize: 0,
        downloadedSize: 0,
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        speed: 0
      };

      response.data.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.status) {
              // Check for download initialization message
              const downloadMatch = data.status.match(/downloading \w+ in (\d+) ([\d.]+ [KMGT]?B) part/);
              if (downloadMatch) {
                const [, parts, size] = downloadMatch;
                progress.totalParts = parseInt(parts, 10);
                progress.totalSize = this.parseSize(size) * progress.totalParts;
                progress.currentPart++;

                // Calculate progress percentage
                const percent = ((progress.currentPart / progress.totalParts) * 100).toFixed(1);

                // Calculate speed and ETA
                const currentTime = Date.now();
                const elapsedTime = (currentTime - progress.startTime) / 1000; // in seconds
                progress.downloadedSize = (progress.currentPart / progress.totalParts) * progress.totalSize;
                progress.speed = progress.downloadedSize / elapsedTime;

                const remainingSize = progress.totalSize - progress.downloadedSize;
                const eta = remainingSize / progress.speed;

                const speedFormatted = `${this.formatSize(progress.speed)}/s`;
                const progressMsg = `Downloading ${modelName}: ${percent}% complete (${this.formatSize(progress.downloadedSize)}/${this.formatSize(progress.totalSize)}) - ${speedFormatted} - ETA: ${this.formatTime(eta)}`;

                onProgress?.(progressMsg);
              } else {
                onProgress?.(data.status);
              }
            }

            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            this.sendError('Download Error', `Failed to download model ${modelName}: ${e}`);
          }
        }
      });

      await new Promise((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.sendError('Download Error', `Failed to download model ${modelName}: ${errorMsg}`);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    // Don't kill the process if it's a system Ollama
    if (this.ollamaProcess && !this.isSystemOllama) {
      this.ollamaProcess.kill();
      this.ollamaProcess = null;
      await this.killExistingOllama();
    }
  }

  private async saveConfig(config: { selectedModel: string }): Promise<void> {
    try {
      await fs.promises.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      useAlert().showAlert('Failed to save config', [error instanceof Error ? error.message : String(error)]);
    }
  }

  private async loadConfig(): Promise<{ selectedModel: string }> {
    try {
      if (await fs.promises.access(this.configPath).then(() => true).catch(() => false)) {
        const data = await fs.promises.readFile(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      useAlert().showAlert('Failed to load config', [error instanceof Error ? error.message : String(error)]);
    }
    return { selectedModel: 'llama3.2:latest' }; // Default model
  }

  public async getDownloadedModels(): Promise<string[]> {
    try {
      const response = await axios.get('http://localhost:11434/api/tags');
      if (response.status === 200 && response.data.models) {
        return response.data.models.map((model: any) => model.name);
      }
    } catch (error) {
      useAlert().showAlert('Failed to get downloaded models', [error instanceof Error ? error.message : String(error)]);
    }
    return [];
  }

  public async getSelectedModel(): Promise<string> {
    const config = await this.loadConfig();
    const downloadedModels = await this.getDownloadedModels();

    // If the saved model is downloaded, use it
    if (downloadedModels.includes(config.selectedModel)) {
      return config.selectedModel;
    }

    // Otherwise, use the first downloaded model or default to llama3.2:latest
    return downloadedModels[0] || 'llama3.2:latest';
  }

  public async setSelectedModel(modelName: string): Promise<void> {
    await this.saveConfig({ selectedModel: modelName });
  }

  private async installOllamaLinux(): Promise<void> {
    return new Promise((resolve, reject) => {
      const installCommand = 'curl -fsSL https://ollama.com/install.sh | sh';
      exec(installCommand, (error, stderr) => {
        if (error) {
          this.sendError('Installation Error', `Failed to install Ollama: ${error.message}`);
          reject(error);
          return;
        }
        if (stderr) {
          useAlert().showAlert('Installation Error', [stderr]);
        }
        resolve();
      });
    });
  }
} 
