import axios from 'axios';
import os from 'os';
import { CONFIG } from '../../config/config';


export async function addTask(
  username: string,
  task_description: string,
  tasks: any[] | null,
  setTasks: (tasks: any[]) => void
) {


  const user = username;

  // let device_name = neuranet.device.name();
  const device_name = os.hostname();
  let taskInfo: any = {
    task_name: task_description,
    task_device: device_name,
    task_status: 'pending',
    task_progress: 0,
  };
  try {
    const url = `${CONFIG.url}/tasks/add_task/${username}/`;
    const response = await axios.post<{ result: string; username: string; task_id: string; }>(url, {
      user: user,
      task_name: task_description,
      task_device: device_name,
      task_progress: 0,
      task_status: 'pending',
    });
    const result = response.data.result;

    if (result === 'success') {

      taskInfo = {
        task_id: response.data.task_id,
        task_name: task_description,
        task_device: device_name,
        task_status: 'pending',
        task_progress: 0,
      };
      setTasks([...(tasks || []), taskInfo]);

      return taskInfo;
    }
    if (result === 'fail') {
      return 'failed';
    }
    if (result === 'task_already_exists') {
      return 'exists';
    }

    else {
      return 'task_add failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

