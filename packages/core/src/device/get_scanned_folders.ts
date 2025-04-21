import axios from 'axios';
import { banbury } from '..'
import { CONFIG } from '../config';


export async function get_scanned_folders(
  username: string,
) {

  const device_name = banbury.device.name();
  const url = `${CONFIG.url}/files/get_scanned_folders/${username}/`;
  const response = await axios.post<{ result: string; username: string; }>(url, {
    device_name: device_name,
  });

  if (response.data.result === 'success') {
    return response.data;
  }
  if (response.data.result === 'fail') {
    return 'failed';
  }
  if (response.data.result === 'task_already_exists') {
    return 'exists';
  }
  else {
    return 'task_add failed';
  }
}

