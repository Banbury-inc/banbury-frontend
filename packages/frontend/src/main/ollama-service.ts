import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { spawn, ChildProcess, exec } from 'child_process';
import * as os from 'os';
import * as crypto from 'crypto';
import * as net from 'net';

export class OllamaService {
    private ollamaProcess: ChildProcess | null = null;
    private readonly ollamaPath: string;
    private isStarting: boolean = false;
    private isSnap: boolean;
    private readonly port: number = 11434;

    constructor() {
        this.ollamaPath = path.join(app.getPath('userData'), 'ollama');
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
            if (process.platform === 'win32') {
                exec('taskkill /F /IM ollama.exe', () => resolve());
            } else {
                exec('pkill ollama', () => resolve());
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

    public async start(): Promise<void> {
        if (this.ollamaProcess || this.isStarting) {
            return;
        }

        this.isStarting = true;

        try {
            // Check if port is in use
            const portInUse = await this.isPortInUse(this.port);
            if (portInUse) {
                console.log(`Port ${this.port} is in use, attempting to kill existing Ollama instance`);
                await this.killExistingOllama();
                await this.waitForPortToBeAvailable();
            }

            // First check if Ollama is already installed on the system
            const systemOllama = await this.isOllamaInstalled();

            let ollamaBinaryPath: string;
            if (systemOllama) {
                // Use system-installed Ollama
                const result = await new Promise<string>((resolve, reject) => {
                    exec('which ollama', (error, stdout) => {
                        if (error) reject(error);
                        else resolve(stdout.trim());
                    });
                });
                ollamaBinaryPath = result;
                console.log('Using system-installed Ollama:', ollamaBinaryPath);
            } else {
                // Use our downloaded binary
                ollamaBinaryPath = this.getBinaryPath();
                if (!fs.existsSync(ollamaBinaryPath) || !this.validateBinary(ollamaBinaryPath)) {
                    await this.downloadOllama();
                }
                ollamaBinaryPath = this.getBinaryPath(); // Get the path again after potential download
            }

            // Start Ollama process with explicit environment
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
                detached: false // Ensure the process is attached to parent
            });

            // Log output for debugging
            this.ollamaProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                console.log(`Ollama stdout: ${output}`);
            });

            this.ollamaProcess.stderr?.on('data', (data) => {
                const error = data.toString();
                console.error(`Ollama stderr: ${error}`);
                // Check for specific error messages
                if (error.includes('bind: address already in use')) {
                    this.ollamaProcess?.kill();
                    this.ollamaProcess = null;
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

            // Wait for Ollama to start
            await this.waitForOllamaStart();
        } catch (error) {
            this.isStarting = false;
            throw error;
        }
    }

    private async waitForOllamaStart(): Promise<void> {
        const maxAttempts = 30;
        const delayMs = 1000;

        for (let i = 0; i < maxAttempts; i++) {
            if (!this.ollamaProcess) {
                throw new Error('Ollama process died during startup');
            }

            try {
                const response = await fetch('http://localhost:11434/api/version');
                const data = await response.json();
                console.log('Ollama version:', data.version);
                this.isStarting = false;
                return;
            } catch (error) {
                if (i === 0) {
                    console.log('Waiting for Ollama to start...');
                }
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        this.stop();
        throw new Error('Ollama failed to start within the timeout period');
    }

    public async stop(): Promise<void> {
        if (this.ollamaProcess) {
            this.ollamaProcess.kill();
            this.ollamaProcess = null;
        }
        // Ensure any remaining Ollama processes are killed
        await this.killExistingOllama();
    }
} 