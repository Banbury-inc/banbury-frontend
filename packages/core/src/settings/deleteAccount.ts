
import axios from 'axios';
import { CONFIG } from '../config';

/**
 *
 * @param username
 * @param taskInfo
 */
export async function deleteAccount(
  username: string | null,
) {

  try {

    const url = `${CONFIG.url}/settings/delete_account/${username}/`;
    const response = await axios.post<{ result: string; username: string; }>(url, {
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

