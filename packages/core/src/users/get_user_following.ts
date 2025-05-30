import axios from 'axios';
import { CONFIG } from '../config';


export async function getUserFollowing(username: string) {
  try {
    const response = await axios.get<{
      result: string;
      following: any;
    }>(
      `${CONFIG.url}/users/get_user_following/${username}`
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

