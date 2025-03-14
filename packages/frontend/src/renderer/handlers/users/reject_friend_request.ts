import axios from 'axios';
import banbury from '@banbury/core';

export async function rejectFriendRequest(
  username: string,
  friend_username: string
) {

  try {

    const response = await axios.post<{
      result: string;
    }>(`${banbury.config.url}/users/reject_friend_request/`, {
      username: username,
      friend_username: friend_username
    });

    const result = response.data.result;
    if (result === 'success') {
      console.log("reject friend request success");
      return 'success';
    }
    if (result === 'fail') {
      console.log("reject friend request failed");
      return 'failed';
    }

    else {
      console.log("reject friend request failed");
      return 'reject friend request failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

