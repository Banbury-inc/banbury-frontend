
import axios from 'axios';
import { CONFIG } from '../../config/config';

/**
 *
 * @param username
 * @param taskInfo
 */
export async function updatePerformanceScoreWeightings(
  username: string | null,
  predicted_cpu_usage_weighting: any,
  predicted_ram_usage_weighting: any,
  predicted_gpu_usage_weighting: any,
  predicted_download_speed_weighting: any,
  predicted_upload_speed_weighting: any
) {

  try {

    const url = `${CONFIG.url}/settings/update_settings/${username}/`;
    const response = await axios.post<{ result: string; username: string; }>(url, {
      predicted_cpu_usage_weighting: predicted_cpu_usage_weighting,
      predicted_ram_usage_weighting: predicted_ram_usage_weighting,
      predicted_gpu_usage_weighting: predicted_gpu_usage_weighting,
      predicted_download_speed_weighting: predicted_download_speed_weighting,
      predicted_upload_speed_weighting: predicted_upload_speed_weighting,
    });
    const result = response.data.result;


    if (result === 'success') {
      console.log("settings update success");
      return response.data.result;
    }
    if (result === 'fail') {
      console.log("settings update failed");
      return 'failed';
    }

    else {
      console.log("settings update failed");
      return 'settings update failed';
    }
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

