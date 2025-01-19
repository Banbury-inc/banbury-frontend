import axios from 'axios';
import { neuranet } from '../../neuranet'
import * as DateUtils from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { CONFIG } from '../../config/config';


export async function remove_scanned_folder(
  scanned_folder: string,
  username: string,
) {


  let user = username;

  let device_name = neuranet.device.name();

  let url = ''

  try {

    url = `${CONFIG.url}/files/remove_scanned_folder/${username}/`;



    const response = await axios.post<{ status: string; username: string; }>(url, {
      device_name: device_name,
      scanned_folder: scanned_folder,
    });
    console.log(response)
    const result = response.data.status;

    if (result === 'success') {

      console.log("remove scanned folder success");

      return result;
    }
    if (result === 'fail') {
      console.log(response)
      return 'failed';
    }
    if (result === 'task_already_exists') {
      return 'exists';
    }

    else {
      console.log("remove scanned folder failed");
      console.log(result);
      return 'task_add failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

