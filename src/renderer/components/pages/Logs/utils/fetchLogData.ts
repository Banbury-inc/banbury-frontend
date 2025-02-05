import axios from 'axios';
import { CONFIG } from '../../../../config/config';



export const fetchLogData = async (
  username: string,
  options: {
    setLogs: (value: any[]) => void;
    setIsLoading: (value: boolean) => void;
  },
) => {
  try {
    const response = await axios.post<{ status: string; sessions: any[] }>(`${CONFIG.url}/sessions/get_session/${username}/`, {
      username: username
    });

    return response.data.sessions;

  } catch (error) {
    console.error('Error fetching logs:', error);
    return [];
  } finally {
    options.setIsLoading(false);
  }
} 
