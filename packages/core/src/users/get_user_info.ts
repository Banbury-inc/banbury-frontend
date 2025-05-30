import axios from 'axios';
import banbury from '@banbury/core';


export async function getFriendUserInfo(friend_username: string) {
  try {
    const response = await axios.get<{
      result: string;
      first_name: string;
      last_name: string;
      phone_number: string;
      email: string;
      picture: any;
      devices: any;
      friends: any[];
      status: any;
      online: boolean;
    }>(
      `${banbury.config.url}/users/getfrienduserinfo/${friend_username}`
    );

    if (response.data.status === 'success') {
      const user_data = {
        "first_name": response.data.first_name,
        "last_name": response.data.last_name,
        "phone_number": response.data.phone_number,
        "email": response.data.email,
        "picture": response.data.picture,
        "devices": response.data.devices,
        "friends": response.data.friends,
        "online": response.data.online,
      }
      return user_data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

