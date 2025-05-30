import axios from 'axios';
import { CONFIG } from '../config';
import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';
import { SessionsTable } from '../types';

/**
 *
 * @param username
 * @param taskInfo
 */
export async function updateTask(
  taskInfo: SessionsTable
) {
  const { token } = loadGlobalAxiosAuthToken();

  try {
    const url = `${CONFIG.url}/tasks/update_task/`;
    const response = await axios.post<{ result: string; taskInfo: SessionsTable }>(url, {
      _id: taskInfo._id,
      device_id: taskInfo.device_id,
      username: taskInfo.username,
      task_type: taskInfo.task_type,
      task_device: taskInfo.task_device,
      task_name: taskInfo.task_name,
      task_progress: taskInfo.task_progress,
      task_status: taskInfo.task_status,
      task_date_modified: new Date().toISOString(),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
    );
    const result = response.data.result;

    if (result === 'success') {
      return response.data.taskInfo;
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

