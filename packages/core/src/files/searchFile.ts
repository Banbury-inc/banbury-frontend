import axios from 'axios';
import os from 'os';
import { CONFIG } from '../config';



export async function searchFile(username: string, fileName: string) {

  try {
    const deviceName = os.hostname();
    const response = await axios.post(`${CONFIG.url}/files/search_file/${username}/`, {
      device_name: deviceName,
      file_name: fileName
    });

    if (response.data.result === 'success') {
      return response.data.file;
    } else if (response.data.result === 'device_not_found') {
      return 'device not found';
    } else if (response.data.result === 'object_id_not_found') {
      return 'object_id_not_found';
    } else if (response.data.result === 'file_not_found') {
      return 'file_not_found';
    }
    else {
      return response.data.result;
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return 'error';
  }
}

