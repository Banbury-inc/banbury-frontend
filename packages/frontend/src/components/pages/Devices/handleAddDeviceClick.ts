import path from 'path';
import os from 'os';
import banbury from '@banbury/core';
import { handlers } from '../../../renderer/handlers';
import { handleFetchDevices } from './handleFetchDevices';



export function handleAddDeviceClick(
  selectedDevice: any,
  setTaskbox_expanded: any,
  setTasks: any,
  showAlert: any,
  tasks: any,
  setLastname: any,
  setFirstname: any,
  setIsLoading: any,
  setAllDevices: any,
  setSelectedDevice: any,
  username: string | null) {
  const handleAddDeviceClick = async () => {
    try {
      const device_name = banbury.device.name();
      const task_description = 'Adding device ' + device_name;
      const taskInfo = await banbury.sessions.addTask(username ?? '', task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const result = await handlers.devices.addDevice(username ?? '');

      if (result === 'success') {
        // Add default directory and refresh device list
        try {
          const defaultDirectory = path.join(os.homedir(), 'BCloud');
          await banbury.device.add_scanned_folder(defaultDirectory, username ?? '');
          handleFetchDevices(selectedDevice, setSelectedDevice, setAllDevices, setFirstname, setIsLoading, setLastname, username);
          await banbury.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
          showAlert('Success', ['Device added successfully'], 'success');
        } catch (folderError) {
          console.error('Error setting up default directory:', folderError);
          await banbury.sessions.failTask(
            username ?? '',
            taskInfo,
            'Failed to set up default directory',
            tasks,
            setTasks
          );
          showAlert('Error', ['Failed to set up default directory', folderError instanceof Error ? folderError.message : 'Unknown error'], 'error');
        }
      } else {
        await banbury.sessions.failTask(
          username ?? '',
          taskInfo,
          'Failed to add device',
          tasks,
          setTasks
        );
        showAlert('Error', ['Failed to add device'], 'error');
      }
    } catch (error) {
      console.error('Error adding device:', error);
      try {
        const errorTaskInfo = await banbury.sessions.addTask(
          username ?? '',
          'Error adding device',
          tasks,
          setTasks
        );
        await banbury.sessions.failTask(
          username ?? '',
          errorTaskInfo,
          error instanceof Error ? error.message : 'Unknown error occurred',
          tasks,
          setTasks
        );
        showAlert('Error', ['Failed to add device', error instanceof Error ? error.message : 'Unknown error'], 'error');
      } catch (taskError) {
        console.error('Failed to create error task:', taskError);
        showAlert('Error', ['Failed to create error task', taskError instanceof Error ? taskError.message : 'Unknown error'], 'error');
      }
    }
  };
  return handleAddDeviceClick;
}


