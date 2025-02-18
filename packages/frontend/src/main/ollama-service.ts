import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { spawn, ChildProcess, exec } from 'child_process';
import * as os from 'os';
import * as crypto from 'crypto';
import * as net from 'net';
import axios from 'axios';

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
    private isSnap: boolean;
    private readonly port: number = 11434;
    private isSystemOllama: boolean = false;
    private readonly configPath: string;

    constructor() {
        this.ollamaPath = path.join(app.getPath('userData'), 'ollama');
        this.configPath = path.join(app.getPath('userData'), 'ollama-config.json');
        this.isSnap = process.env.SNAP !== undefined;
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
        const version = '0.1.27';

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
        const binaryName = platform === 'win32' ? 'ollama.exe' : 'ollama';
        return path.join(this.ollamaPath, binaryName);
    }

    private validateBinary(binaryPath: string): boolean {
        try {
            // Check if file exists and is executable
            fs.accessSync(binaryPath, fs.constants.X_OK);

            // Read first few bytes to check if it's a valid ELF file (Linux) or Mach-O (macOS)
            const header = Buffer.alloc(4);
            const fd = fs.openSync(binaryPath, 'r');
            fs.readSync(fd, header, 0, 4, 0);
            fs.closeSync(fd);

            // Check for ELF magic number (Linux)
            if (header[0] === 0x7F && header[1] === 0x45 && header[2] === 0x4C && header[3] === 0x46) {
                return true;
            }

            // Check for Mach-O magic number (macOS)
            if (header.readUInt32BE(0) === 0xFEEDFACE || header.readUInt32BE(0) === 0xFEEDFACF) {
                return true;
            }

            return false;
        } catch (error) {
            console.error('Binary validation failed:', error);
            return false;
        }
    }

    private async downloadOllama(): Promise<void> {
        const binaryPath = this.getBinaryPath();
        const downloadUrl = this.getOllamaBinaryUrl();

        console.log('Downloading Ollama from:', downloadUrl);
        console.log('Saving to:', binaryPath);

        if (fs.existsSync(binaryPath)) {
            console.log('Removing existing binary');
            fs.unlinkSync(binaryPath);
        }

        return new Promise((resolve, reject) => {
            const handleResponse = (response: any) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
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
                            reject(new Error('Downloaded binary validation failed'));
                            return;
                        }
                        console.log('Successfully downloaded and validated binary');
                        resolve();
                    } catch (error) {
                        reject(new Error(`Failed to process binary: ${error}`));
                    }
                });

                fileStream.on('error', (error) => {
                    fs.unlinkSync(binaryPath);
                    reject(new Error(`Failed to write binary: ${error}`));
                });
            };

            https.get(downloadUrl, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    console.log('Following redirect to:', response.headers.location);
                    https.get(response.headers.location!, handleResponse)
                        .on('error', reject);
                } else {
                    handleResponse(response);
                }
            }).on('error', reject);
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
                    console.warn(`Unsupported platform: ${process.platform}`);
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
                console.log('Ollama API responded with version:', response.data.version);
                return true;
            }
            return false;
        } catch (error) {
            if (error instanceof Error) {
                console.log('API check failed:', error.message);
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
                    console.error(error);
                    throw error;
                }

                const isResponsive = await this.checkOllamaAPI();
                if (isResponsive) {
                    this.isStarting = false;
                    return;
                }

                if (i === 0) {
                    console.log('Waiting for Ollama to become responsive...');
                } else {
                    console.log(`Still waiting for Ollama to become responsive... (attempt ${i + 1}/${maxAttempts})`);
                }

                // Check process logs for specific errors
                if (this.ollamaProcess?.stderr) {
                    const logs = await new Promise<string>((resolve) => {
                        let buffer = '';
                        this.ollamaProcess?.stderr?.on('data', (data) => {
                            buffer += data.toString();
                        });
                        setTimeout(() => resolve(buffer), 100);
                    });

                    if (logs.includes('error')) {
                        console.error('Found error in Ollama logs:', logs);
                    }
                }

                await new Promise(resolve => setTimeout(resolve, delayMs));
            } catch (error) {
                if (error instanceof Error && error.message.includes('process exited')) {
                    this.isStarting = false;
                    throw error;
                }
                console.error('Error during API check:', error);
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
                try {
                    const response = await axios.get('http://localhost:11434/api/version');
                    console.log('Existing Ollama instance found, version:', response.data.version);
                    this.isSystemOllama = true;
                    this.isStarting = false;
                    return;
                } catch (error) {
                    // Wait a bit before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log('No responsive Ollama instance found, checking system installation...');

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
                console.log('Using system-installed Ollama:', ollamaBinaryPath);
            } else {
                ollamaBinaryPath = this.getBinaryPath();
                if (!fs.existsSync(ollamaBinaryPath) || !this.validateBinary(ollamaBinaryPath)) {
                    await this.downloadOllama();
                }
                ollamaBinaryPath = this.getBinaryPath();
            }

            // Always try to clean up any existing processes and ports
            console.log('Cleaning up any existing Ollama processes...');
            await this.killExistingOllama();
            await this.waitForPortToBeAvailable();

            // Start Ollama process
            console.log('Starting Ollama process...');
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

            // Log process ID for debugging
            console.log(`Started Ollama process with PID: ${this.ollamaProcess.pid}`);

            this.ollamaProcess.stdout?.on('data', (data) => {
                console.log(`Ollama stdout: ${data.toString().trim()}`);
            });

            this.ollamaProcess.stderr?.on('data', (data) => {
                const errorMsg = data.toString().trim();
                console.error(`Ollama stderr: ${errorMsg}`);
                if (errorMsg.includes('bind: address already in use')) {
                    console.log('Port already in use, will try to use existing instance');
                    this.isSystemOllama = true;
                }
            });

            this.ollamaProcess.on('error', (error) => {
                console.error('Failed to start Ollama process:', error);
                this.isStarting = false;
                this.ollamaProcess = null;
            });

            this.ollamaProcess.on('close', (code, signal) => {
                console.log(`Ollama process exited with code ${code} and signal ${signal}`);
                this.ollamaProcess = null;
                this.isStarting = false;
            });

            // Give the process a moment to start
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Wait for Ollama to be responsive
            await this.waitForOllamaStart();
        } catch (error) {
            console.error('Error during Ollama startup:', error);
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
            try {
                console.log('Ollama not responsive, attempting to restart...');
                await this.start();
                
                const isNowResponsive = await this.checkOllamaAPI();
                if (!isNowResponsive) {
                    throw new Error('Ollama service failed to start');
                }
            } catch (error) {
                throw new Error('Ollama service is not running and could not be started');
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
                        console.error('Failed to parse progress data:', e);
                    }
                }
            });

            await new Promise((resolve, reject) => {
                response.data.on('end', resolve);
                response.data.on('error', reject);
            });

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Model download failed: ${error.message}`);
            }
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
            console.error('Failed to save config:', error);
        }
    }

    private async loadConfig(): Promise<{ selectedModel: string }> {
        try {
            if (await fs.promises.access(this.configPath).then(() => true).catch(() => false)) {
                const data = await fs.promises.readFile(this.configPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        }
        return { selectedModel: 'llama2' }; // Default model
    }

    public async getDownloadedModels(): Promise<string[]> {
        try {
            const response = await axios.get('http://localhost:11434/api/tags');
            if (response.status === 200 && response.data.models) {
                return response.data.models.map((model: any) => model.name);
            }
        } catch (error) {
            console.error('Failed to get downloaded models:', error);
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
} 