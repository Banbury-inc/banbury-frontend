import axios from 'axios';
import banbury from '@banbury/core';

export async function removeFriend(
  username: string,
  friend_username: string
) {

  try {

    const response = await axios.post<{
      result: string;
    }>(`${banbury.config.url}/users/remove_friend/`, {
      username: username,
      friend_username: friend_username
    });

    const result = response.data.result;
    if (result === 'success') {
      console.log("remove friend success");
      return 'success';
    }
    if (result === 'fail') {
      console.log("remove friend failed, ", response);
      return 'failed';
    }

    else {
      console.log("remove friend failed");
      return 'remove friend failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

