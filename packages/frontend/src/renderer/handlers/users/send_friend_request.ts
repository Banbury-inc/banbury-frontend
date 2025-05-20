import axios from 'axios';
import banbury from '@banbury/core';

export async function sendFriendRequest(
  friend_username: string
) {
    const response = await axios.post<{
      result: string;
    }>(`${banbury.config.url}/users/send_friend_request/`, {
      friend_username: friend_username
    });

    const result = response.data.result;
    if (result === 'success') {
      const notification = {
        type: 'friend_request',
        title: 'Friend Request',
        description: 'You have a new friend request',
        timestamp: new Date(),
        read: false,
      };
      const response = await banbury.notifications.addNotification(friend_username, notification);
      if (response === 'success') {
        return 'success';
      }
      else {
        return 'failed';
      }
    }
    if (result === 'fail') {
      return 'failed';
    }
    if (result === 'user_already_exists') {
      return 'exists';
    }

    else {
      return 'register failed';
    }
  }

