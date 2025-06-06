import axios from 'axios';
import { CONFIG } from '../config';

export async function getFriends() {
  try {
    const response = await axios.get<{
      result: string;
      friends: any[];
    }>(
      `${CONFIG.url}/users/get_friends/`
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

