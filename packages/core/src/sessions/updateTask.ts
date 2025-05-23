import axios from 'axios';
import { CONFIG } from '../config';
import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';

/**
 *
 * @param username
 * @param taskInfo
 */
export async function updateTask(
  taskInfo: any
) {
  const { token } = loadGlobalAxiosAuthToken();

  try {
    const url = `${CONFIG.url}/tasks/update_task/`;
    const response = await axios.post<{ result: string; task_id: string; }>(url, {
      task_id: taskInfo.task_id,
      task_name: taskInfo.task_name,
      task_progress: taskInfo.task_progress,
      task_status: taskInfo.task_status,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
    );
    const result = response.data.result;

    if (result === 'success') {
      taskInfo.task_id = response.data.task_id;
      return response.data;
    }
    if (result === 'fail') {
      return 'failed';
    }
    if (result === 'device_already_exists') {
      return 'exists';
    }

    else {
      return 'device_add failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

