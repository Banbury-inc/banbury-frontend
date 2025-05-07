
import axios from 'axios';
import { banbury } from '..'
import { CONFIG } from '../config';


export async function addDeviceIdToFileSyncFile(
  file_name: string,
) {

  const device_name = banbury.device.name();
  const url = `${CONFIG.url}/predictions/add_device_id_to_file_sync_file/`;

  const response = await axios.post<{ result: string }>(url, {
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

