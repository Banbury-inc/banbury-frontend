import axios from 'axios';
import { CONFIG } from '../config';

export async function removeDownloadedModel(
  model_name: string,
  device_id: string,
) {
  const url = `${CONFIG.url}/devices/remove_downloaded_model/`;

  const response = await axios.post<{ result: string }>(url, {
    device_id: device_id,
    model_name: model_name,
  });
  const result = response.data.result;

  if (result === 'success') {
    return result;
  }
  if (result === 'fail') {
    return 'failed';
  }
  if (result === 'task_already_exists') {
    return 'exists';
  }
  else {
    return 'task_add failed';
  }
}

