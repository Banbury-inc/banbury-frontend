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
export async function failTask(
  taskInfo: any,
  response: any,
  tasks: any,
  setTasks: any

) {
  const task_response = response;
  const { token } = loadGlobalAxiosAuthToken();

  try {
    const url = `${CONFIG.url}/tasks/fail_task/`;
    const response = await axios.post<{ result: string }>(url, {
      task_id: taskInfo.task_id,
      task_name: taskInfo.task_name,
      result: task_response,
      task_device: taskInfo.task_device,
      task_progress: taskInfo.task_progress,
      task_status: 'error',
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
      return 'success';
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

