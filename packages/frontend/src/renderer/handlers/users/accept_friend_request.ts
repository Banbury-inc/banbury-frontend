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
      console.log("accept friend request success");
      return 'success';
    }
    if (result === 'fail') {
      console.log("accept friend request failed");
      return 'failed';
    }

    else {
      console.log("accept friend request failed");
      return 'accept friend request failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

