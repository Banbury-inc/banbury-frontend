
import axios from 'axios';
import { CONFIG } from '../../config/config';

/**
 *
 * @param username
 * @param taskInfo
 */
export async function updateScoreConfigurationPreferences(
  username: string | null,
  use_predicted_cpu_usage: any,
  use_predicted_ram_usage: any,
  use_predicted_gpu_usage: any,
  use_predicted_download_speed: any,
  use_predicted_upload_speed: any,
  use_files_needed: any,
  use_files_available_for_download: any,
  use_device_in_file_sync: any,
  device_name: string
) {


  try {

    const url = `${CONFIG.url}/devices/update_device_configurations/${username}/`;
    const response = await axios.post<{ result: string; username: string; }>(url, {
      device_name: device_name,
      use_predicted_cpu_usage: use_predicted_cpu_usage,
      use_predicted_ram_usage: use_predicted_ram_usage,
      use_predicted_gpu_usage: use_predicted_gpu_usage,
      use_predicted_download_speed: use_predicted_download_speed,
      use_predicted_upload_speed: use_predicted_upload_speed,
      use_files_needed: use_files_needed,
      use_files_available_for_download: use_files_available_for_download,
      use_device_in_file_sync: use_device_in_file_sync,
    });
    const result = response.data.result;


    if (result === 'success') {
      return response.data.result;
    }
    if (result === 'fail') {
      return 'failed';
    }

    else {
      return 'settings update failed';
    }
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

