import axios from 'axios';
import banbury from '@banbury/core';

export async function sendFriendRequest(
  username: string,
  friend_username: string
) {

  try {
    const response = await axios.post<{
      result: string;
    }>(`${banbury.config.url}/users/send_friend_request/`, {
      username: username,
      friend_username: friend_username
    });

    const result = response.data.result;
    if (result === 'success') {
      const notification = {
        type: 'friend_request',
        title: 'Friend Request',
        description: 'You have a new friend request from ' + username,
        timestamp: new Date(),
        read: false,
      };
      const response = await banbury.notifications.addNotification(friend_username, notification);
      if (response === 'success') {
        return 'success';
      }
      else {
        console.error("send friend request failed");
        return 'failed';
      }
    }
    if (result === 'fail') {
      console.log("send friend request failed");
      return 'failed';
    }
    if (result === 'user_already_exists') {
      console.log("user already exists");
      return 'exists';
    }

    else {
      console.log("register failed");
      return 'register failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }

}

