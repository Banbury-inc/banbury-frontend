import axios from 'axios';
import { CONFIG } from '../config';

export async function add_downloaded_model(
  model_name: string,
  username: string,
  device_id: number,
) {
  const url = `${CONFIG.url}/devices/add_downloaded_model/${username}/`;

  const response = await axios.post<{ result: string; username: string; }>(url, {
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

