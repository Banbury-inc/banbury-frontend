import axios from 'axios';
import { CONFIG } from '../config';

export async function addDownloadedModel(
  model_name: string,
  device_id: string,
) {
  const url = `${CONFIG.url}/devices/add_downloaded_model/`;

  const response = await axios.post<{ result?: string; error?: string; message?: string }>(url, {
    device_id: device_id,
    model_name: model_name,
  });

  // Handle success case
  if (response.data.result === 'success') {
    // Check if the model was already downloaded
    if (response.data.message?.includes('already downloaded')) {
      return 'already_exists';
    }
    return 'success';
  }

  // Handle error cases
  if (response.data.error) {
    // Map specific error messages to appropriate return values
    const error = response.data.error;
    
    if (error.includes('User not found') || error.includes('Device not found')) {
      return 'device_not_found';
    }
    
    if (error.includes('Failed to update')) {
      return 'update_failed';
    }
    
    return 'error';
  }

  // Fallback for fail result
  if (response.data.result === 'fail') {
    return 'failed';
  }

  // Fallback for unexpected responses
  return 'unknown_error';
}

