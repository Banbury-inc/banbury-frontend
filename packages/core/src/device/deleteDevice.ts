import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';
import axios from 'axios';
import { CONFIG } from '../config';

export async function deleteDevice(
  selectedDeviceNames: string[]
) {
  const url = `${CONFIG.url}/devices/delete_device/`;
  const results = [];
  const { token } = loadGlobalAxiosAuthToken();

  for (const device_name of selectedDeviceNames) {
    try {
      const response = await axios.post<{ result: string }>(
        url,
        { device_name: device_name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = response.data.result;

      if (result === 'success') {
        results.push(result);
      }
      else if (result === 'fail cant find user') {
        results.push(result);
      }
      else if (result === 'fail cant find device') {
        results.push(result);
      }
      else if (result === 'task_already_exists') {
        results.push('exists');
      }
      else {
        results.push('task_add failed: ' + result);
      }
    } catch (error) {
      results.push(error);
    }
  }

  return results;
}

