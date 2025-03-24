import axios from 'axios';
import { banbury } from '..'
import { CONFIG } from '../config';


export async function declare_online(
  username: string,
) {



  const device_name = banbury.device.name();

  try {
    const url = `${CONFIG.url}/devices/declare_online/${username}/`;
    const response = await axios.post<{ result: string; user: string; }>(url, {
      device_name: device_name,
    });
    const result = response.data.result;

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
      return 'task_add failed';
    }
  } catch (error) {
    return error;
  }
}

