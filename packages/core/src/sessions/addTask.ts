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


    if (result === 'success' && response.data.task_info) {
      setTasks([...(tasks || []), taskInfo]);
    } else if (result === 'success' && !response.data.task_info) {
      console.warn('Server returned success but no task_info data');
    }

    return taskInfo;
  } catch (error) {
    console.error('Error fetching data:', error);
    // Return a fallback task with a temporary ID
    const taskInfo = {
      _id: '',
      device_id: '',
      username: '',
      task_type: '',
      task_name: task_description,
      task_device: device_name,
      task_status: 'failed',
      task_progress: 0,
      task_date_added: new Date().toISOString(),
      task_date_modified: new Date().toISOString(),
    }
    return taskInfo;
  }
}

