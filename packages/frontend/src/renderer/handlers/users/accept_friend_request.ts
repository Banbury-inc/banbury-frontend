import banbury from '@banbury/core';
import axios from 'axios';

export async function acceptFriendRequest(
  username: string,
  friend_username: string
) {

  try {

    const response = await axios.post<{
      result: string;
    }>(`${banbury.config.url}/users/accept_friend_request/`, {
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
      return 'accept friend request failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

