
import axios from 'axios';
import { CONFIG } from '../config';

/**
 *
 * @param username
 * @param taskInfo
 */
export async function addFileRequestSuccess() {
  try {

    const url = `${CONFIG.url}/analytics/add_file_request_success/`;
    const response = await axios.post<{ result: string; }>(url, {
    });
    const result = response.data.result;


    if (result === 'success') {
      return response.data.result;
    }
    if (result === 'fail') {
      return 'failed';
    }
    else {
      return 'file request failed';
    }
  } catch (error) {
    return error; // Ensure an error is returned if the request
  }
}

