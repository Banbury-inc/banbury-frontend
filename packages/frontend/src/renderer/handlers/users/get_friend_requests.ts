import axios from 'axios';
import banbury from '@banbury/core';


export async function getFriendRequests(username: string) {
  try {
    const response = await axios.get<{
      result: string;
      friend_requests: any[];
    }>(
      `${banbury.config.url}/users/get_friend_requests/${username}`
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

