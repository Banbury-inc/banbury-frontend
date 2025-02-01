import axios from 'axios';
import { DatabaseData } from '../components/NewTreeView/types';
import { CONFIG } from '../../../../config/config';



export const fetchSharedFilesData = async (
  username: string,
  options: {
    setSharedFiles: (value: DatabaseData[]) => void;
    setIsLoading: (value: boolean) => void;
  },
) => {
  try {
    const response = await axios.post<{ status: string; shared_files: { shared_files: any[] } }>(`${CONFIG.url}/files/get_shared_files/`, {
      username: username
    });

    console.log('Shared files response:', response.data);
    
    // Handle the nested shared_files structure
    if (response.data?.shared_files?.shared_files && Array.isArray(response.data.shared_files.shared_files)) {
      const files = response.data.shared_files.shared_files;
      console.log('Extracted shared files:', files);
      return files;
    }
    
    console.warn('Unexpected response format:', response.data);
    return [];

  } catch (error) {
    console.error('Error fetching shared files:', error);
    return [];
  } finally {
    options.setIsLoading(false);
  }
} 
