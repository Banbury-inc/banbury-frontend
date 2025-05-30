import axios from 'axios';
import banbury from '@banbury/core';
import { User } from '@banbury/core/src/types';

interface UserSearchResponse {
  result: string;
  users?: User[];
}

export async function typeahead(query: string) {
    const response = await axios.get<UserSearchResponse>(
      `${banbury.config.url}/users/typeahead/${query}`
    );

    if (response.data.result === 'success') {
      return response;
    }
    return null;
}

