import axios from 'axios';
import { CONFIG } from '../config';

export async function removeDownloadedModel(
  model_name: string,
  device_id: string,
) {
  const url = `${CONFIG.url}/devices/remove_downloaded_model/`;

  const response = await axios.post<{ result?: string; error?: string }>(url, {
    device_id: device_id,
    model_name: model_name,
  });

  // Handle success case
  if (response.data.result === 'success') {
    return 'success';
  }

  // Handle error cases
  if (response.data.error) {
    // Map specific error messages to appropriate return values
    const error = response.data.error;
    
    if (error.includes('User not found') || error.includes('Device not found')) {
      return 'device_not_found';
    }
    
    if (error.includes('Model not found')) {
      return 'model_not_found';
    }
    
    if (error.includes('No downloaded models found')) {
      return 'no_models_found';
    }
    
    if (error.includes('Failed to update')) {
      return 'update_failed';
    }
    
    return 'error';
  }

  // Fallback for unexpected responses
  return 'unknown_error';
}

