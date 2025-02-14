import axios from 'axios';
import { CONFIG } from '../config';

export async function removeFiles(
  username: string,
  device_name: string,
  filesInfo: any) {


  try {
    const response = await axios.post<{
      result: string;
    }>(`${CONFIG.url}/files/delete_files/${username}/`, {
      files: filesInfo,
      device_name: device_name,
    });

    const result = response.data.result;
    if (result === 'success') {
      return 'success';
    } else if (result === 'fail') {
      return 'failed';
    } else if (result === 'device_not_found') {
      return 'device not found';
    } else if (result === 'object_id_not_found') {
      return 'device not found';

    } else {
      return 'add file failed';
    }
  } catch (error) {
    console.error('Error adding file:', error);
    return 'error';
  }
}
