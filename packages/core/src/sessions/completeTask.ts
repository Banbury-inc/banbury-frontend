import axios from 'axios';
import { CONFIG } from '../config';
import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';

/**
 *
 * @param username
 * @param taskInfo
 * @param tasks
 * @param setTasks
 */
export async function completeTask(
  taskInfo: any,
  tasks: any,
  setTasks: any

) {
  const { token } = loadGlobalAxiosAuthToken();

  try {
    const url = `${CONFIG.url}/tasks/update_task/`;
    const response = await axios.post<{ result: string; task_id: string; }>(url, {
      task_id: taskInfo.task_id,
      task_name: taskInfo.task_name,
      task_progress: 100,
      task_status: 'complete',
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
    );
    const result = response.data.result;

    if (result === 'success') {
      setTasks([...(tasks || []), taskInfo]);
      return response.data;
    }
    if (result === 'fail') {
      return 'failed';
    }
    if (result === 'device_already_exists') {
      return 'exists';
    }

    else {
      return 'else loop hit';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

