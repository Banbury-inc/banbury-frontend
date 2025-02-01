import axios from 'axios';
import { DatabaseData } from '../components/NewTreeView/types';
import { CONFIG } from '../../../../config/config';



export const fetchFileSyncData = async (
  username: string,
  global_file_path: string,
  options: {
    setFirstname: (value: string) => void;
    setLastname: (value: string) => void;
    setSyncRows: (value: DatabaseData[]) => void;
    setAllFiles: (value: DatabaseData[]) => void;
    setIsLoading: (value: boolean) => void;
    cache: Map<string, DatabaseData[]>;
  },
) => {


  try {

    // Fetch fresh data from API
    const [fileInfoResponse] = await Promise.all([
      axios.post<{ files: any[]; }>(`${CONFIG.url}/predictions/get_files_to_sync/${username}/`, {
        global_file_path: global_file_path
      })
    ]);


    return fileInfoResponse.data.files;


  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    options.setIsLoading(false);
  }
} 
