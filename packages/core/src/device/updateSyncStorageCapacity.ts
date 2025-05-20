import axios from 'axios';
import { banbury } from '..'
import { CONFIG } from '../config';


export async function updateSyncStorageCapacity(
  sync_storage_capacity_gb: string,
) {

  const device_name = banbury.device.name();

  let url = ''

  try {

    url = `${CONFIG.url}/predictions/update_sync_storage_capacity/`;



    const response = await axios.post<{ result: string }>(url, {
      device_name: device_name,
      storage_capacity: sync_storage_capacity_gb,
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
  } catch (error) {
    return error; // Ensure an error is returned if the request fails
  }
}

