
import axios from 'axios';
import { neuranet } from '..'
import { CONFIG } from '../../config/config';


export async function add_device_id_to_file_sync_file(
  file_name: string,
  username: string,
) {

  const device_name = neuranet.device.name();
  console.log(file_name);


  const url = `${CONFIG.url}/predictions/add_device_id_to_file_sync_file/${username}/`;

  const response = await axios.post<{ result: string; username: string; }>(url, {
    device_name: device_name,
    file_name: file_name,
  });
  console.log(response);
  const result = response.data.result;
  console.log(result);

  if (result === 'success') {

    console.log("add device id to file sync success");

    return result;
  }
  if (result === 'fail') {
    console.log("add device id to file sync failed");
    return 'failed';
  }
  if (result === 'task_already_exists') {
    console.log("task already exists");
    return 'exists';
  }

  else {
    console.log("add device id to file sync failed");
    console.log(result);
    return 'task_add failed';
  }
}

