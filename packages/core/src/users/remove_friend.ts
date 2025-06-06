import axios from 'axios';
import { CONFIG } from '../config';

export async function removeFriend(
  username: string,
  friend_username: string
) {

  try {

    const response = await axios.post<{
      result: string;
    }>(`${CONFIG.url}/users/remove_friend/`, {
      username: username,
      friend_username: friend_username
    });

    const result = response.data.result;
    if (result === 'success') {
      return 'success';
    }
    if (result === 'fail') {
      return 'failed';
    }

    else {
      return 'remove friend failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

