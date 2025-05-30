import axios from 'axios';
import { CONFIG } from '../config';
import { NotificationsTable } from '../types';
import { addNotification } from '../notifications/addNotification';

export async function sendFriendRequest(
  friend_username: string
) {
    const response = await axios.post<{
      result: string;
    }>(`${CONFIG.url}/users/send_friend_request/`, {
      friend_username: friend_username
    });

    const result = response.data.result;
    if (result === 'success') {
      const notification: NotificationsTable = {
        _id: '',
        type: 'friend_request',
        title: 'Friend Request',
        description: 'You have a new friend request',
        timestamp: new Date().toISOString(),
        read: false,
      };
      const response = await addNotification(friend_username, notification);
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

