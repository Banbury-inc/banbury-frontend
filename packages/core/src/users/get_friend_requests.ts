import axios from 'axios';
import { CONFIG } from '../config';

export async function getFriendRequests() {
  try {
    const response = await axios.get<{
      result: string;
      friend_requests: any[];
    }>(
      `${CONFIG.url}/users/get_friend_requests/`
    );

    if (response.data.result === 'success') {
      return response;
    }
    return null;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

