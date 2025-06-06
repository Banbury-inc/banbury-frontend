import axios from 'axios';
import { CONFIG } from '../config';
import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';

export async function acceptFriendRequest(
  friend_username: string
) {

  try {
    await loadGlobalAxiosAuthToken();
    const response = await axios.post<{
      result: string;
    }>(`${CONFIG.url}/users/accept_friend_request/`, {
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
      return 'accept friend request failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

