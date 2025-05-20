
import axios from 'axios';
import { banbury } from '..'
import { CONFIG } from '../config';


export async function getDownloadQueue(
) {

  const device_name = banbury.device.name();
  let url = ''

  try {

    url = `${CONFIG.url}/predictions/get_download_queue/`;

    const response = await axios.post<{ result: string; }>(url, {
      device_name: device_name,
    });
    const result = response.data.result;

    if (result === 'success') {
      return response.data;

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
  } catch (error) {
    return error; // Ensure an error is returned if the request fails
  }
}

