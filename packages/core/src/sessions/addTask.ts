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
  let taskInfo: SessionsTable = {
    _id: `local_${Date.now()}`, // Generate local ID for tracking
    device_id: '',
    username: '',
    task_type: '',
    task_name: task_description,
    task_device: device_name,
    task_status: 'pending',
    task_progress: 0,
    task_date_added: new Date().toISOString(),
    task_date_modified: new Date().toISOString(),
  };

  // Add to tasks list immediately for local tracking
  if (tasks) {
    setTasks([...tasks, taskInfo]);
  }

  const { token } = loadGlobalAxiosAuthToken();
  try {
    const url = `${CONFIG.url}/tasks/add_task/`;
    const response = await axios.post<{ result: string; taskInfo: SessionsTable }>(url, {
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

    if (result === 'success') {
      // Update with server response data
      taskInfo = {
        _id: response.data.taskInfo._id,
        device_id: response.data.taskInfo.device_id,
        username: response.data.taskInfo.username,
        task_type: response.data.taskInfo.task_type,
        task_name: response.data.taskInfo.task_name,
        task_device: response.data.taskInfo.task_device,
        task_status: response.data.taskInfo.task_status,
        task_progress: response.data.taskInfo.task_progress,
        task_date_added: response.data.taskInfo.task_date_added,
        task_date_modified: response.data.taskInfo.task_date_modified,
      };
      
      // Update the tasks list with server data
      if (tasks) {
        const updatedTasks = tasks.map(task => 
          task._id.startsWith('local_') && task.task_name === task_description 
            ? taskInfo 
            : task
        );
        setTasks(updatedTasks);
      }
    }
    // For failed cases, keep the local task object

    return taskInfo;
  } catch (error) {
    console.error('Error fetching data:', error);
    // Return the local task object even on error
    return taskInfo;
  }
}

