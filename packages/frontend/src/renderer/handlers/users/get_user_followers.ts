import axios from 'axios';
import banbury from '@banbury/core';


export async function getUserFriends(username: string) {
  try {
    const response = await axios.get<{
      result: string;
      friends: any;
    }>(
      `${banbury.config.url}/users/get_user_friends/${username}`
    );

    if (response.data.result === 'success') {
      console.log("get user friends success");
      return response;
    }
    console.log("get user friends failed");
    return null;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

