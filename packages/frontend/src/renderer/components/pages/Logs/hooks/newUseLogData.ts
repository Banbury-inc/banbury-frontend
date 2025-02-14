import { useEffect, useState } from 'react';
import { fetchLogData } from '../utils/fetchLogData';
import { LogData } from '../types';

export const UseLogData = (
  username: string | null,
  disableFetch: boolean,
  updates: number,
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<LogData[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!username || disableFetch) return;

      try {
        const logs_data = await fetchLogData(username, {
          setLogs,
          setIsLoading,
        });

        if (Array.isArray(logs_data) && logs_data.length > 0) {
          const transformedLogs: any[] = logs_data.map((log: any) => ({
            _id: log._id,
            device_id: log.device_id,
            username: log.username,
            task_name: log.task_name,
            task_device: log.task_device,
            task_status: log.task_status,
            task_progress: log.task_progress,
            task_date_added: new Date(log.task_date_added).toLocaleString(),
            task_date_modified: new Date(log.task_date_modified).toLocaleString(),
          }));

          setLogs(transformedLogs);
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error('Error in fetchInitialData:', error);
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [username, updates, disableFetch]);

  return { isLoading, logs, setLogs };
};


