import axios from 'axios';
import { CONFIG } from '../config';
import { UsersTable } from '../types';

export async function registerUser(
  user: UsersTable,
) {
  try {

    const response = await axios.post<{
      result: string;
    }>(`${CONFIG.url}/authentication/register/`, {
      username: user.username,
      password: user.password,
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
    if (result === 'user_already_exists') {
      return 'exists';
    }
    else {
      return 'register failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

