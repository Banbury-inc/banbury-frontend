import axios from 'axios';
import banbury from '@banbury/core';


export async function getUserInfo(username: string) {
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
      `${banbury.config.url}/users/getuserinfo/${username}`
    );

    if (response.data.status === 'success') {
      console.log("get user info success");
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
      console.log("user_data", user_data);
      return user_data;
    }
    console.log("get user info failed. response:", response);
    return null;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

