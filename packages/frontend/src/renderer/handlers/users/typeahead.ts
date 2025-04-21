import axios from 'axios';
import banbury from '@banbury/core';

interface UserSearchResponse {
  result: string;
  users?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    status: string;
    username: string;
  }>;
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

