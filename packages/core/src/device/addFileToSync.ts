import axios from 'axios';
import { banbury } from '..'
import { CONFIG } from '../config';


export async function addFileToSync(
  file_path: string,
) {

  const device_name = banbury.device.name();
  const url = `${CONFIG.url}/predictions/add_file_to_sync/`;

  const response = await axios.post<{ result: string; username: string; }>(url, {
    device_name: device_name,
    file_path: file_path,
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

