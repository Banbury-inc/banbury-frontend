import axios from 'axios';
import { banbury } from '..'
import { CONFIG } from '../config';


export async function addScannedFolder(
  scanned_folder: string,
) {



  const device_name = banbury.device.name();

  let url = ''

  try {

    url = `${CONFIG.url}/files/add_scanned_folder/`;



    const response = await axios.post<{ result: string; }>(url, {
      device_name: device_name,
      scanned_folder: scanned_folder,
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
    return error;
  }
}

