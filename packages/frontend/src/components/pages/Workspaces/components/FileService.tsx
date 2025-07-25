import { MentionableFile, getFileExtension } from './MentionExtension';
import { stat, readdir } from 'fs/promises';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { CONFIG } from '@banbury/core/src/config';

export class FileService {
  private fileCache: Map<string, MentionableFile[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private scannedFolders: string[] = [];
  private lastScannedFoldersUpdate: number = 0;
  private readonly SCANNED_FOLDERS_CACHE_DURATION = 60000; // 1 minute

  constructor() {
    this.fileCache = new Map();
    this.cacheExpiry = new Map();
  }

  /**
   * Get scanned folders from all devices
   */
  private async getScannedFoldersFromAllDevices(): Promise<string[]> {
    // Check if we have cached scanned folders
    const now = Date.now();
    if (this.scannedFolders.length > 0 && (now - this.lastScannedFoldersUpdate) < this.SCANNED_FOLDERS_CACHE_DURATION) {
      return this.scannedFolders;
    }

    try {
      // Fetch device information from all devices
      const deviceInfoResponse = await axios.get<{
        devices: any[];
      }>(`${CONFIG.url}/devices/getdeviceinfo/`);

      const { devices } = deviceInfoResponse.data;
      
      // Collect scanned folders from all devices
      const allScannedFolders: string[] = [];
      
      for (const device of devices) {
        if (device.scanned_folders && Array.isArray(device.scanned_folders)) {
          allScannedFolders.push(...device.scanned_folders);
        }
      }
      
      // Remove duplicates
      this.scannedFolders = [...new Set(allScannedFolders)];
      this.lastScannedFoldersUpdate = now;
      
      // Fallback to common directories if no scanned folders are configured
      if (this.scannedFolders.length === 0) {
        console.warn('No scanned folders configured for any device, using default directories');
        this.scannedFolders = [
          os.homedir(),
          path.join(os.homedir(), 'Documents'),
          path.join(os.homedir(), 'Desktop')
        ];
      }
      
      return this.scannedFolders;
    } catch (error) {
      console.error('Error getting scanned folders from all devices:', error);
      
      // Fallback to default directories on error
      console.warn('Using default directories as fallback');
      this.scannedFolders = [
        os.homedir(),
        path.join(os.homedir(), 'Documents'),
        path.join(os.homedir(), 'Desktop')
      ];
      
      return this.scannedFolders;
    }
  }

  /**
   * Get files for mention suggestions based on a query
   */
  async getFilesForMention(query: string = '', currentPath?: string): Promise<MentionableFile[]> {
    try {
      // Get scanned folders from all devices
      const scannedFolders = await this.getScannedFoldersFromAllDevices();
      
      if (scannedFolders.length === 0) {
        console.warn('No scanned folders found for device');
        return [];
      }

      // Use the first scanned folder as the search path, or current path if provided
      const searchPath = currentPath || scannedFolders[0];
      
      // Check cache first
      const cacheKey = `${searchPath}_${query}`;
      const cachedFiles = this.getFromCache(cacheKey);
      if (cachedFiles) {
        return cachedFiles;
      }

      // Get files from directory
      const files = await this.getFilesFromDirectory(searchPath);
      
      // Filter based on query
      const filteredFiles = this.filterFiles(files, query);
      
      // Cache the results
      this.setCache(cacheKey, filteredFiles);
      
      return filteredFiles;
    } catch (error) {
      console.error('Error getting files for mention:', error);
      return [];
    }
  }

  /**
   * Get recent files for quick access
   */
  async getRecentFiles(limit: number = 10): Promise<MentionableFile[]> {
    try {
      // Get scanned folders from all devices
      const scannedFolders = await this.getScannedFoldersFromAllDevices();
      
      if (scannedFolders.length === 0) {
        console.warn('No scanned folders found for device');
        return [];
      }

      const allFiles: MentionableFile[] = [];

      // Search through scanned folders
      for (const dirPath of scannedFolders) {
        try {
          const files = await this.getFilesFromDirectory(dirPath, false);
          allFiles.push(...files.slice(0, 3)); // Take first 3 from each directory
        } catch {
          // Skip directories that can't be accessed
          continue;
        }
      }

      return allFiles.slice(0, limit);
    } catch (error) {
      console.error('Error getting recent files:', error);
      return [];
    }
  }

  /**
   * Search for files by name across all scanned folders
   */
  async searchFiles(query: string, maxResults: number = 20): Promise<MentionableFile[]> {
    if (!query.trim()) {
      return this.getRecentFiles(maxResults);
    }

    try {
      // Get scanned folders from all devices
      const searchPaths = await this.getScannedFoldersFromAllDevices();
      
      if (searchPaths.length === 0) {
        console.warn('No scanned folders found for device');
        return [];
      }

      const allFiles: MentionableFile[] = [];

      for (const searchPath of searchPaths) {
        try {
          const files = await this.getFilesFromDirectory(searchPath);
          const filtered = this.filterFiles(files, query);
          allFiles.push(...filtered);
        } catch {
          continue;
        }
      }

      // Remove duplicates and sort by relevance
      const uniqueFiles = this.removeDuplicateFiles(allFiles);
      const sortedFiles = this.sortFilesByRelevance(uniqueFiles, query);
      
      return sortedFiles.slice(0, maxResults);
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  private async getFilesFromDirectory(dirPath: string, _includeSubdirs: boolean = true): Promise<MentionableFile[]> {
    try {
      const items = await readdir(dirPath);
      const files: MentionableFile[] = [];

      for (const item of items) {
        try {
          const fullPath = path.join(dirPath, item);
          const stats = await stat(fullPath);
          
          // Skip hidden files and system files
          if (item.startsWith('.')) continue;
          
          const file: MentionableFile = {
            id: fullPath,
            name: item,
            path: fullPath,
            type: stats.isDirectory() ? 'folder' : 'file',
            size: stats.isFile() ? stats.size : undefined,
            extension: stats.isFile() ? getFileExtension(item) : undefined,
          };

          files.push(file);
        } catch {
          // Skip files that can't be accessed
          continue;
        }
      }

      return files;
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      return [];
    }
  }

  private filterFiles(files: MentionableFile[], query: string): MentionableFile[] {
    if (!query.trim()) {
      return files;
    }

    const lowercaseQuery = query.toLowerCase();
    
    return files.filter(file => {
      const nameMatch = file.name.toLowerCase().includes(lowercaseQuery);
      const pathMatch = file.path.toLowerCase().includes(lowercaseQuery);
      const extensionMatch = file.extension?.toLowerCase().includes(lowercaseQuery) || false;
      
      return nameMatch || pathMatch || extensionMatch;
    });
  }

  private sortFilesByRelevance(files: MentionableFile[], query: string): MentionableFile[] {
    const lowercaseQuery = query.toLowerCase();
    
    return files.sort((a, b) => {
      // Exact name matches first
      if (a.name.toLowerCase() === lowercaseQuery) return -1;
      if (b.name.toLowerCase() === lowercaseQuery) return 1;
      
      // Name starts with query
      if (a.name.toLowerCase().startsWith(lowercaseQuery)) return -1;
      if (b.name.toLowerCase().startsWith(lowercaseQuery)) return 1;
      
      // Files before folders
      if (a.type === 'file' && b.type === 'folder') return -1;
      if (a.type === 'folder' && b.type === 'file') return 1;
      
      // Alphabetical order
      return a.name.localeCompare(b.name);
    });
  }

  private removeDuplicateFiles(files: MentionableFile[]): MentionableFile[] {
    const seen = new Set<string>();
    return files.filter(file => {
      if (seen.has(file.path)) {
        return false;
      }
      seen.add(file.path);
      return true;
    });
  }

  private getFromCache(key: string): MentionableFile[] | null {
    const cached = this.fileCache.get(key);
    const expiry = this.cacheExpiry.get(key);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    // Clean up expired cache
    this.fileCache.delete(key);
    this.cacheExpiry.delete(key);
    
    return null;
  }

  private setCache(key: string, files: MentionableFile[]): void {
    this.fileCache.set(key, files);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  /**
   * Clear the file cache
   */
  clearCache(): void {
    this.fileCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Refresh scanned folders from all devices
   */
  async refreshScannedFolders(): Promise<string[]> {
    this.lastScannedFoldersUpdate = 0; // Force refresh
    return this.getScannedFoldersFromAllDevices();
  }
}

// Export a singleton instance
export const fileService = new FileService(); 