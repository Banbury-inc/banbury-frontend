import axios from 'axios';
import banbury from '@banbury/core';

export async function registerUser(
  username: string,
  password_str: string,
  first_name: string,
  last_name: string,
  phone_number: string,
  email: string,
  picture: string) {

  try {

    const response = await axios.post<{
      result: string;
      username: string;
    }>(`${banbury.config.url}/authentication/register/`, {
      username: username,
      password: password_str,
      first_name: first_name,
      last_name: last_name,
      phone_number: phone_number,
      email: email,
      picture: picture
    });

    const result = response.data.result;
    if (result === 'success') {
      return 'success';
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
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

