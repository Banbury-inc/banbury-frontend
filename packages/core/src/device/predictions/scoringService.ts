/**
 * TypeScript implementation of the Python ScoringService
 * 
 * This service calculates weighted performance scores for devices based on predicted metrics.
 * Key improvements over the Python version:
 * - Strong TypeScript typing for better IDE support and error checking
 * - Improved error handling with proper error messages
 * - Safe normalization function to prevent division by zero
 * - Better documentation and code organization
 * - Async/await pattern for cleaner asynchronous code
 * 
 * Usage:
 * ```typescript
 * import { ScoringService } from '@banbury/core';
 * 
 * const scoringService = new ScoringService();
 * const scoredDevices = await scoringService.devices(performanceData);
 * ```
 */

import { getSettings, type UserSettings, type SettingsResponse } from '../../settings/getSettings';

// Types and interfaces
export interface DevicePerformanceData {
  device_name: string;
  predicted_upload_speed: number;
  predicted_download_speed: number;
  predicted_gpu_usage: number;
  predicted_cpu_usage: number;
  predicted_ram_usage: number;
  score?: number;
  sync_storage_capacity_gb?: number;
  use_device_in_file_sync?: boolean;
}

/**
 * ScoringService class for calculating weighted performance scores for devices
 */
export class ScoringService {
  /**
   * Initializes the ScoringService
   */
  constructor() {
    // Constructor is intentionally empty
  }

  /**
   * Calculates a weighted score for each device based on predicted performance.
   * 
   * Normalizes predicted metrics (speeds, usage) between 0 and 100. Higher speeds
   * are better, lower usage is better. Applies weights fetched from user settings
   * to compute a final score for each device.
   * 
   * @param performanceData - Array of device performance data objects
   * @returns Promise resolving to the input array with 'score' added to each device
   */
  async devices(performanceData: DevicePerformanceData[]): Promise<DevicePerformanceData[]> {
    if (!performanceData || performanceData.length === 0) {
      throw new Error('Performance data is required and cannot be empty');
    }

    // Calculate min/max values for normalization
    const maxUploadSpeed = Math.max(...performanceData.map(device => device.predicted_upload_speed));
    const minUploadSpeed = Math.min(...performanceData.map(device => device.predicted_upload_speed));
    const maxDownloadSpeed = Math.max(...performanceData.map(device => device.predicted_download_speed));
    const minDownloadSpeed = Math.min(...performanceData.map(device => device.predicted_download_speed));
    const maxGpuUsage = Math.max(...performanceData.map(device => device.predicted_gpu_usage));
    const minGpuUsage = Math.min(...performanceData.map(device => device.predicted_gpu_usage));
    const maxCpuUsage = Math.max(...performanceData.map(device => device.predicted_cpu_usage));
    const minCpuUsage = Math.min(...performanceData.map(device => device.predicted_cpu_usage));
    const maxRamUsage = Math.max(...performanceData.map(device => device.predicted_ram_usage));
    const minRamUsage = Math.min(...performanceData.map(device => device.predicted_ram_usage));

    // Fetch user settings
    const settingsResponse = await getSettings();
    const settings = settingsResponse.settings || {};

    // Default weightings if not found in settings
    const predictedUploadSpeedWeighting = settings.predicted_upload_speed_weighting ?? 0.2;
    const predictedDownloadSpeedWeighting = settings.predicted_download_speed_weighting ?? 0.2;
    const predictedGpuUsageWeighting = settings.predicted_gpu_usage_weighting ?? 0.2;
    const predictedCpuUsageWeighting = settings.predicted_cpu_usage_weighting ?? 0.2;
    const predictedRamUsageWeighting = settings.predicted_ram_usage_weighting ?? 0.2;

    // Calculate scores for each device
    const scoredDevices = performanceData.map(device => {
      // Helper function to safely normalize values (avoid division by zero)
      const safeNormalize = (value: number, min: number, max: number): number => {
        if (max === min) return 100; // If all values are the same, give full score
        return ((value - min) / (max - min)) * 100;
      };

      // Normalize metrics (0-100 scale)
      const normalizedUploadSpeed = safeNormalize(device.predicted_upload_speed, minUploadSpeed, maxUploadSpeed);
      const normalizedDownloadSpeed = safeNormalize(device.predicted_download_speed, minDownloadSpeed, maxDownloadSpeed);
      
      // For usage metrics, invert the normalization (lower usage is better)
      const normalizedGpuUsage = (1 - safeNormalize(device.predicted_gpu_usage, minGpuUsage, maxGpuUsage) / 100) * 100;
      const normalizedCpuUsage = (1 - safeNormalize(device.predicted_cpu_usage, minCpuUsage, maxCpuUsage) / 100) * 100;
      const normalizedRamUsage = (1 - safeNormalize(device.predicted_ram_usage, minRamUsage, maxRamUsage) / 100) * 100;

      // Compute weighted score
      const score = (
        predictedUploadSpeedWeighting * normalizedUploadSpeed +
        predictedDownloadSpeedWeighting * normalizedDownloadSpeed +
        predictedGpuUsageWeighting * normalizedGpuUsage +
        predictedCpuUsageWeighting * normalizedCpuUsage +
        predictedRamUsageWeighting * normalizedRamUsage
      );

      return {
        ...device,
        score
      };
    });

    return scoredDevices;
  }
}

/**
 * Example usage and testing function
 */
export async function main(): Promise<void> {
  const scoringService = new ScoringService();
  
  const performanceData: DevicePerformanceData[] = [
    {
      device_name: "device1",
      predicted_upload_speed: 100,
      predicted_download_speed: 200,
      predicted_gpu_usage: 50,
      predicted_cpu_usage: 50,
      predicted_ram_usage: 50
    },
    {
      device_name: "device2",
      predicted_upload_speed: 200,
      predicted_download_speed: 100,
      predicted_gpu_usage: 100,
      predicted_cpu_usage: 100,
      predicted_ram_usage: 100
    }
  ];

  try {
    await scoringService.devices(performanceData);
  } catch (error) {
    console.error('Error in scoring service:', error);
  }
}

// Export the instance for easy usage
export const scoringService = new ScoringService();
