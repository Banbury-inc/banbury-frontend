import { useEffect, useState } from 'react';
import { fetchDeviceData } from '../utils/fetchDeviceData';
import { fetchFileSyncData } from '../utils/fetchFileSyncData';


export const newUseFileData = (
  username: string | null,
  disableFetch: boolean,
  updates: number,
  global_file_path: string | null,
  global_file_path_device: string | null,
  setFirstname: (name: string) => void,
  setLastname: (name: string) => void,
  devices: any,
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [syncRows, setSyncRows] = useState<any[]>([]);

  // Initial load effect
  useEffect(() => {
    const fetchInitialData = async () => {
      const sync_files_data = await fetchFileSyncData(username || '', global_file_path || '');

      if (sync_files_data) {
        setSyncRows(sync_files_data);
        setAllFiles(sync_files_data);
      }
      setIsLoading(false);
    };

    fetchInitialData();
  }, [updates]); // Empty dependency array for initial load

  // Reset everything when updates change
  useEffect(() => {
    setIsLoading(true);
    setSyncRows([]);
    setAllFiles([]);
  }, [updates]);


  useEffect(() => {
    const fetchData = async () => {
      if (!devices) {
        fetchDeviceData(username || '');
        return;
      }

      const sync_files_data = await fetchFileSyncData(username || '', global_file_path || '');

      if (sync_files_data) {
        setSyncRows([]);
        setSyncRows(sync_files_data);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [global_file_path, global_file_path_device, devices, disableFetch, username, updates]);

  return { isLoading, allFiles, syncRows, setSyncRows };
};


