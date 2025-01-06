import axios from 'axios';
import { CONFIG } from '../../config/config';


export async function getFriends(username: string) {
  try {
    const response = await axios.get<{
      result: string;
      friends: any[];
    }>(
      `${CONFIG.url}/users/get_friends/${username}`
    );

    if (response.data.result === 'success') {
      console.log("get friends success");
      return response;
    }
    console.log("get friends failed");
    return null;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

