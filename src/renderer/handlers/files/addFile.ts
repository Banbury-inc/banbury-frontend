import axios from 'axios';
import { neuranet } from '../../neuranet'

export async function addFile(
  username: string,
  fileInfo: any) {

  const taskInfo = {
    name: 'add file ' + fileInfo.file_name,
    device: fileInfo.original_device,
    status: 'pending',
  }


  try {
    const response = await axios.post<{
      result: string;
    }>('https://website2-389236221119.us-central1.run.app/add_file/' + username + '/', {
      file_type: fileInfo.file_type,
      file_name: fileInfo.file_name,
      file_path: fileInfo.file_path,
      date_uploaded: fileInfo.date_uploaded,
      date_modified: fileInfo.date_modified,
      file_size: fileInfo.file_size,
      file_priority: fileInfo.file_priority,
      file_parent: fileInfo.file_parent,
      original_device: fileInfo.original_device,
      kind: fileInfo.kind,
    });

    const result = response.data.result;
    if (result === 'success') {
      console.log("File added successfully");
      const taskInfo = {
        name: 'add file ' + fileInfo.file_name,
        device: fileInfo.original_device,
        status: 'complete',
      }
      const task = await neuranet.sessions.updateTask(username, taskInfo);
      return 'success';
    } else if (result === 'fail') {
      const taskInfo = {
        name: 'add file ' + fileInfo.file_name,
        device: fileInfo.original_device,
        status: 'fail',
      }
      const task = await neuranet.sessions.updateTask(username, taskInfo);

      console.log("Failed to add file");
      return 'failed';
    } else if (result === 'device_not_found') {
      console.log("Device not found");
      return 'device not found';
    } else if (result === 'object_id_not_found') {
      console.log("object id not found");
      return 'device not found';

    } else {
      console.log("Failed to add file");
      return 'add file failed';
    }
  } catch (error) {
    console.error('Error adding file:', error);
    return 'error';
  }
}
