import axios from 'axios';
import { CONFIG } from '../config';
import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';
import { UsersTable } from '../types';

export async function change_profile_info(
  user: UsersTable,
) {
  try {

    const response = await axios.post<{
      result: string;
    }>(`${CONFIG.url}/users/update_profile/`, {
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      email: user.email,
      picture: user.picture,
    });

    const result = response.data.result;
    if (result === 'success') {
      return 'success';
    }
    if (result === 'fail') {
      return 'failed';
    }
    if (result === 'photo_too_large') {
      return 'photo_too_large';
    }
    else {
      return 'change profile failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

