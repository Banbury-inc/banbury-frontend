import axios from 'axios';
import { CONFIG } from '../config';

export interface UserSettings {
  predicted_upload_speed_weighting?: number;
  predicted_download_speed_weighting?: number;
  predicted_gpu_usage_weighting?: number;
  predicted_cpu_usage_weighting?: number;
  predicted_ram_usage_weighting?: number;
  sync_entire_device_checked?: boolean;
}

export interface SettingsResponse {
  result: string;
  settings: UserSettings;
  username: string;
}

/**
 * Fetches user settings from the backend
 * @returns Promise containing user settings response
 */
export async function getSettings(): Promise<SettingsResponse> {
  try {
    const url = `${CONFIG.url}/settings/get_settings/`;
    const response = await axios.post<SettingsResponse>(url);
    
    if (response.data.result === 'success') {
      return response.data;
    } else {
      throw new Error(`Failed to get settings: ${response.data.result}`);
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }
} 