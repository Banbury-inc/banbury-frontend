import axios from 'axios';
import banbury from '@banbury/core';


export async function getFriends(username: string) {
  try {
    const response = await axios.get<{
      result: string;
      friends: any[];
    }>(
      `${banbury.config.url}/users/get_friends/${username}`
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

