
import axios from 'axios';
import { CONFIG } from '../config';

/**
 *
 * @param username
 * @param taskInfo
 */
export async function updatePerformanceScoreWeightings(
  predicted_cpu_usage_weighting: any,
  predicted_ram_usage_weighting: any,
  predicted_gpu_usage_weighting: any,
  predicted_download_speed_weighting: any,
  predicted_upload_speed_weighting: any
) {

  try {

    const url = `${CONFIG.url}/settings/update_settings/`;
    const response = await axios.post<{ result: string }>(url, {
      predicted_cpu_usage_weighting: predicted_cpu_usage_weighting,
      predicted_ram_usage_weighting: predicted_ram_usage_weighting,
      predicted_gpu_usage_weighting: predicted_gpu_usage_weighting,
      predicted_download_speed_weighting: predicted_download_speed_weighting,
      predicted_upload_speed_weighting: predicted_upload_speed_weighting,
    });
    const result = response.data.result;


    if (result === 'success') {
      return response.data.result;
    }
    if (result === 'fail') {
      return 'failed';
    }

    else {
      return 'failed';
    }
  } catch (error) {
    return error;
  }
}

