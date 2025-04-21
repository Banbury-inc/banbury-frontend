import axios from 'axios';
import banbury from '@banbury/core';



export const fetchFileSyncData = async (
  username: string,
  global_file_path: string,
) => {

  try {

    // Fetch fresh data from API
    const [fileInfoResponse] = await Promise.all([
      axios.post<{ files: any[]; }>(`${banbury.config.url}/predictions/get_files_to_sync/${username}/`, {
        global_file_path: global_file_path
      })
    ]);


    return fileInfoResponse.data.files;


  } catch (error) {
    console.error('Error fetching data:', error);
  }
} 
