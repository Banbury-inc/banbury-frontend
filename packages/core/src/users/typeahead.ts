import axios from 'axios';
import { CONFIG } from '../config';
import { User } from '../types';

interface UserSearchResponse {
  result: string;
  users?: User[];
}

export async function typeahead(query: string) {
    const response = await axios.get<UserSearchResponse>(
      `${CONFIG.url}/users/typeahead/${query}`
    );

    if (response.data.result === 'success') {
      return response;
    }
    return null;
}

