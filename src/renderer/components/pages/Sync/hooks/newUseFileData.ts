import { useEffect, useState } from 'react';
import path from 'path';
import os from 'os';
import { fetchDeviceData } from '../utils/fetchDeviceData';
import { fetchFileSyncData } from '../utils/fetchFileSyncData';

const file_name: string = 'mmills_database_snapshot.json';
const directory_name: string = 'BCloud';
const directory_path: string = path.join(os.homedir(), directory_name);

export const newUseFileData = (
  username: string | null,
  disableFetch: boolean,
  updates: number,
  global_file_path: string | null,
  global_file_path_device: string | null,
  setFirstname: (name: string) => void,
  setLastname: (name: string) => void,
  devices: any,
  setDevices: (devices: any[]) => void,
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [syncRows, setSyncRows] = useState<any[]>([]);

  // Initial load effect
  useEffect(() => {
    const fetchInitialData = async () => {
      const sync_files_data = await fetchFileSyncData(username || '', global_file_path || '', {
        setFirstname,
        setLastname,
        setSyncRows,
        setAllFiles,
        setIsLoading,
        cache: new Map(),
      });

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

      const sync_files_data = await fetchFileSyncData(username || '', global_file_path || '', {
        setFirstname,
        setLastname,
        setSyncRows,
        setAllFiles,
        setIsLoading,
        cache: new Map(),
      });

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


