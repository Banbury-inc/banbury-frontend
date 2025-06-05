import axios from 'axios';
import os from 'os';
import { CONFIG } from '../config';
import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';
import { SessionsTable } from '../types';

export async function addTask(
  task_description: string,
  tasks: SessionsTable[] | null,
  setTasks: (tasks: SessionsTable[]) => void
): Promise<SessionsTable> {

  // let device_name = neuranet.device.name();
  const device_name = os.hostname();

  const { token } = loadGlobalAxiosAuthToken();
  
  // Fallback task object for error cases
  const createFallbackTask = (status: 'failed' | 'pending' = 'failed'): SessionsTable => ({
    _id: '',
    device_id: '',
    username: '',
    task_type: '',
    task_name: task_description,
    task_device: device_name,
    task_status: status,
    task_progress: 0,
    task_date_added: new Date().toISOString(),
    task_date_modified: new Date().toISOString(),
  });

  try {
    const url = `${CONFIG.url}/tasks/add_task/`;
    const response = await axios.post<{ result: string; task_info: SessionsTable }>(url, {
      task_name: task_description,
      task_device: device_name,
      task_progress: 0,
      task_status: 'pending',
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

    const result = response.data.result;
    const taskInfo = response.data.task_info;

    if (result === 'success' && taskInfo) {
      setTasks([...(tasks || []), taskInfo]);
      return taskInfo;
    } else if (result === 'success' && !taskInfo) {
      console.warn('Server returned success but no task_info data');
      // Return a fallback task with pending status since server said success
      return createFallbackTask('pending');
    }

    // If result is not success, return fallback task
    return createFallbackTask('failed');
  } catch (error) {
    console.error('Error fetching data:', error);
    // Return a fallback task with a temporary ID
    return createFallbackTask('failed');
  }
}

