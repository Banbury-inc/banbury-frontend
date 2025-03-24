import axios from 'axios';
import banbury from '@banbury/core';

export async function change_profile_info(
  username: string,
  first_name: string,
  last_name: string,
  phone_number: string,
  email: string,
  picture: any | null) {

  try {

    const response = await axios.post<{
      result: string;
    }>(`${banbury.config.url}/users/update_profile/`, {
      username: username,
      first_name: first_name,
      last_name: last_name,
      phone_number: phone_number,
      email: email,
      picture: picture,
    });

    const result = response.data.result;
    if (result === 'success') {
      return 'success';
    }
    if (result === 'fail') {
      return 'failed';
    }
    if (result === 'photo_too_large') {
      return 'photo_too_large';
    }
    else {
      return 'change profile failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

