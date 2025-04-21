
import axios from 'axios';
import { banbury } from '..'
import { CONFIG } from '../config';


export async function add_device_id_to_file_sync_file(
  file_name: string,
  username: string,
) {

  const device_name = banbury.device.name();
  const url = `${CONFIG.url}/predictions/add_device_id_to_file_sync_file/${username}/`;

  const response = await axios.post<{ result: string; username: string; }>(url, {
    device_name: device_name,
    file_name: file_name,
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

