import axios from 'axios';
import { banbury } from '..'
import { CONFIG } from '../config';


export async function delete_device(
  username: string,
) {

  let url

  url = `${CONFIG.url}/devices/delete_device/${username}/`;

  const device_name = banbury.device.name();

  try {
    const response = await axios.post<{ result: string; user: string; }>(url, {
      device_name: device_name,
    });
    const result = response.data.result;

    console.log('result', result);

    if (result === 'success') {


      return result;
    }
    if (result === 'fail cant find user') {
      return result;
    }
    if (result === 'fail cant find device') {
      return result;
    }

    if (result === 'task_already_exists') {
      return 'exists';
    }

    else {
      return 'task_add failed: ' + result;
    }
  } catch (error) {
    return error;
  }
}

