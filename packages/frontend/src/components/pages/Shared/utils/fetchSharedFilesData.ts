import axios from 'axios';
import { DatabaseData } from '../types';
import banbury from '@banbury/core';



export const fetchSharedFilesData = async (
  username: string,
  options: {
    setSharedFiles: (value: DatabaseData[]) => void;
    setIsLoading: (value: boolean) => void;
  },
) => {
  try {
    const response = await axios.post<{ status: string; shared_files: { shared_files: any[] } }>(`${banbury.config.url}/files/get_shared_files/`, {
      username: username
    });


    // Handle the nested shared_files structure
    if (response.data?.shared_files?.shared_files && Array.isArray(response.data.shared_files.shared_files)) {
      const files = response.data.shared_files.shared_files;
      return files;
    }
    return [];

  } catch (error) {
    console.error('Error fetching shared files:', error);
    return [];
  } finally {
    options.setIsLoading(false);
  }
} 
