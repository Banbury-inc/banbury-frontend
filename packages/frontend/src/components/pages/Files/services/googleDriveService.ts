/**
 * Centralized Google Drive Service
 * Provides a single source of truth for Google Drive files with shared caching
 */

import { listGoogleDriveFiles } from '@banbury/core/src/files/googleDrive';
import { banbury } from '@banbury/core';

export interface GoogleDriveFileRow {
  id: string;
  file_name: string;
  kind: 'Folder' | 'File';
  file_size: number;
  date_modified?: string;
  date_uploaded?: string;
  mime_type: string;
  web_view_link?: string;
  thumbnail_link?: string;
  parents: string[];
  source: 'google_drive';
  device_name: string;
  available: string;
  file_priority: number;
  is_public: boolean;
  original_device: string;
  file_path: string;
  google_drive_id?: string;
}

interface CachedFiles {
  files: GoogleDriveFileRow[];
  nextPageToken?: string;
  hasMorePages: boolean;
  timestamp: number;
  folderId?: string;
}

interface CachedStatus {
  enabled: boolean;
  timestamp: number;
}

class GoogleDriveService {
  private fileCache = new Map<string, CachedFiles>();
  private statusCache: CachedStatus | null = null;
  private folderIdMap = new Map<string, string>();
  private ongoingRequests = new Map<string, Promise<any>>();
  
  // Cache durations
  private readonly FILE_CACHE_DURATION = 30000; // 30 seconds
  private readonly STATUS_CACHE_DURATION = 60000; // 1 minute
  
  // Event listeners for cache updates
  private listeners = new Set<(folderId?: string) => void>();

  /**
   * Subscribe to cache updates
   */
  public subscribe(listener: (folderId?: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of cache updates
   */
  private notifyListeners(folderId?: string): void {
    this.listeners.forEach(listener => listener(folderId));
  }

  /**
   * Check if Google Drive is enabled (with caching)
   */
  public async isGoogleDriveEnabled(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached value if still valid
    if (this.statusCache && (now - this.statusCache.timestamp) < this.STATUS_CACHE_DURATION) {
      return this.statusCache.enabled;
    }

    try {
      const isEnabled = await banbury.settings.isGoogleDriveEnabled();
      this.statusCache = { enabled: isEnabled, timestamp: now };
      return isEnabled;
    } catch (error) {
      console.error('Error checking Google Drive status:', error);
      return false;
    }
  }

  /**
   * Get cache key for a specific folder
   */
  private getCacheKey(folderId?: string, username?: string): string {
    return `${username || 'default'}_${folderId || 'root'}`;
  }

  /**
   * Transform API files to our format
   */
  private transformFiles(files: any[], basePath: string): GoogleDriveFileRow[] {
    return files.map((file) => {
      const googleDriveFilePath = basePath === 'Core/GoogleDrive' || basePath === 'GoogleDrive'
        ? `Core/GoogleDrive/${file.file_name}`
        : `${basePath}/${file.file_name}`;

      return {
        id: file.id,
        file_name: file.file_name,
        kind: file.kind,
        file_size: file.file_size,
        date_modified: file.date_modified,
        date_uploaded: file.date_uploaded,
        mime_type: file.mime_type,
        web_view_link: file.web_view_link,
        thumbnail_link: file.thumbnail_link,
        parents: file.parents,
        source: 'google_drive',
        device_name: 'Google Drive',
        available: 'Available',
        file_priority: 1,
        is_public: false,
        original_device: 'Google Drive',
        file_path: googleDriveFilePath,
        google_drive_id: file.id
      };
    });
  }

  /**
   * Update folder ID mapping from file paths
   */
  private updateFolderIdMap(files: GoogleDriveFileRow[]): void {
    files.forEach(file => {
      if (file.kind === 'Folder') {
        const pathParts = file.file_path.split('/');
        const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
        if (googleDriveIndex !== -1 && googleDriveIndex < pathParts.length - 1) {
          const folderPath = pathParts.slice(googleDriveIndex + 1).join('/');
          this.folderIdMap.set(folderPath, file.id);
        }
      }
    });
  }

  /**
   * Extract folder ID from path
   */
  public extractFolderId(path: string): string | undefined {
    if (!path.includes('Core/GoogleDrive') && path !== 'GoogleDrive') {
      return undefined;
    }
    
    const pathParts = path.split('/');
    const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
    
    if (googleDriveIndex === -1 || googleDriveIndex === pathParts.length - 1) {
      return undefined; // Root Google Drive folder
    }
    
    const folderPath = pathParts.slice(googleDriveIndex + 1).join('/');
    return this.folderIdMap.get(folderPath);
  }

  /**
   * Fetch files from a specific folder (with caching and deduplication)
   */
  public async getFiles(
    folderId?: string,
    filePath: string = 'Core/GoogleDrive',
    username?: string,
    pageToken?: string,
    forceRefresh: boolean = false
  ): Promise<{
    files: GoogleDriveFileRow[];
    nextPageToken?: string;
    hasMorePages: boolean;
  }> {
    // Check if Google Drive is enabled
    const isEnabled = await this.isGoogleDriveEnabled();
    if (!isEnabled) {
      return { files: [], hasMorePages: false };
    }

    const cacheKey = this.getCacheKey(folderId, username);
    const requestKey = `${cacheKey}_${pageToken || 'initial'}`;
    
    // If there's already an ongoing request for this exact query, return it
    if (this.ongoingRequests.has(requestKey)) {
      return this.ongoingRequests.get(requestKey);
    }

    // Check cache first (only for initial loads, not pagination)
    if (!pageToken && !forceRefresh) {
      const cached = this.fileCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.FILE_CACHE_DURATION) {
        return {
          files: cached.files,
          nextPageToken: cached.nextPageToken,
          hasMorePages: cached.hasMorePages
        };
      }
    }

    // Create the request promise
    const requestPromise = this.fetchFilesFromAPI(folderId, filePath, cacheKey, pageToken);
    this.ongoingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up the ongoing request
      this.ongoingRequests.delete(requestKey);
    }
  }

  /**
   * Internal method to fetch files from API
   */
  private async fetchFilesFromAPI(
    folderId?: string,
    filePath: string = 'Core/GoogleDrive',
    cacheKey?: string,
    pageToken?: string
  ): Promise<{
    files: GoogleDriveFileRow[];
    nextPageToken?: string;
    hasMorePages: boolean;
  }> {
    try {
      const result = await listGoogleDriveFiles(pageToken, folderId);
      
      if (!result || !result.files || !Array.isArray(result.files)) {
        return { files: [], hasMorePages: false };
      }

      const transformedFiles = this.transformFiles(result.files, filePath);
      
      // Update folder mapping
      this.updateFolderIdMap(transformedFiles);

      const response = {
        files: transformedFiles,
        nextPageToken: result.nextPageToken,
        hasMorePages: !!result.nextPageToken
      };

      // Cache the results (only for initial loads)
      if (!pageToken && cacheKey) {
        this.fileCache.set(cacheKey, {
          files: transformedFiles,
          nextPageToken: result.nextPageToken,
          hasMorePages: !!result.nextPageToken,
          timestamp: Date.now(),
          folderId
        });

        // Notify listeners of cache update
        this.notifyListeners(folderId);
      }

      return response;
    } catch (error: any) {
      console.error('Error fetching Google Drive files:', error);
      
      if (error.response?.status === 401 || error.message === 'GOOGLE_DRIVE_AUTH_REQUIRED') {
        throw new Error('GOOGLE_DRIVE_AUTH_REQUIRED');
      }
      
      throw error;
    }
  }

  /**
   * Get all root-level files (for tree view)
   */
  public async getRootFiles(username?: string, forceRefresh: boolean = false): Promise<GoogleDriveFileRow[]> {
    const result = await this.getFiles(undefined, 'Core/GoogleDrive', username, undefined, forceRefresh);
    return result.files;
  }

  /**
   * Get files from cache without making API calls
   */
  public getCachedFiles(folderId?: string, username?: string): GoogleDriveFileRow[] | null {
    const cacheKey = this.getCacheKey(folderId, username);
    const cached = this.fileCache.get(cacheKey);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.FILE_CACHE_DURATION) {
      return null; // Cache expired
    }
    
    return cached.files;
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.fileCache.clear();
    this.statusCache = null;
    this.folderIdMap.clear();
    this.notifyListeners();
  }

  /**
   * Clear cache for a specific folder
   */
  public clearFolderCache(folderId?: string, username?: string): void {
    const cacheKey = this.getCacheKey(folderId, username);
    this.fileCache.delete(cacheKey);
    this.notifyListeners(folderId);
  }

  /**
   * Update folder ID mapping (for navigation)
   */
  public setFolderId(folderPath: string, folderId: string): void {
    this.folderIdMap.set(folderPath, folderId);
  }

  /**
   * Get folder ID from mapping
   */
  public getFolderId(folderPath: string): string | undefined {
    return this.folderIdMap.get(folderPath);
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService(); 