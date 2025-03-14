import axios from 'axios';
import { banbury } from '..'
import { CONFIG } from '../config';


export async function add_scanned_folder(
  scanned_folder: string,
  username: string,
) {



  const device_name = banbury.device.name();

  let url = ''

  try {

    url = `${CONFIG.url}/files/add_scanned_folder/${username}/`;



    const response = await axios.post<{ result: string; username: string; }>(url, {
      device_name: device_name,
      scanned_folder: scanned_folder,
    });
    const result = response.data.result;

    if (result === 'success') {

      console.log("add scanned folder success");

      return result;
    }
    if (result === 'fail') {
      console.log("add scanned folder failed");
      return 'failed';
    }
    if (result === 'task_already_exists') {
      console.log("task already exists");
      return 'exists';
    }

    else {
      console.log("add scanned folder failed");
      console.log(result);
      return 'task_add failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return 'error'; // Ensure an error is returned if the request fails
  }
}

