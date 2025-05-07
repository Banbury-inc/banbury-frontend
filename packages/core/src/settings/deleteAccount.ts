import axios from 'axios';
import { CONFIG } from '../config';

/**
 *
 * @param username
 * @param taskInfo
 */
export async function deleteAccount(
) {

  try {
    const url = `${CONFIG.url}/settings/delete_account/`;
    const response = await axios.post<{ result: string }>(url, {
    });
    const result = response.data.result;

    if (result === 'success') {
      return response.data.result;
    }
    if (result === 'fail') {
      return 'failed';
    }

    else {
      return 'failed';
    }
  } catch (error) {
    return error;
  }
}

