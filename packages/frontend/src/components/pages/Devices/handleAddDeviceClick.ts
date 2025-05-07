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
  setIsLoading: any,
  setAllDevices: any,
  setSelectedDevice: any,
  username: string | null) {
  const handleAddDeviceClick = async () => {
    if (!username) {
      showAlert('Error', ['No username provided'], 'error');
      return;
    }
    
    try {
      const device_name = banbury.device.name();
      const task_description = 'Adding device ' + device_name;
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const response = await handlers.devices.addDevice(username);
      
      if (response?.result === 'success') {
        // Add default directory and refresh device list
        try {
          const defaultDirectory = path.join(os.homedir(), 'BCloud');
          await banbury.device.addScannedFolder(defaultDirectory);
          
          // Call fetchDevices function and await its result to ensure it completes before proceeding
          const fetchDevicesFn = handleFetchDevices(selectedDevice, setSelectedDevice, setAllDevices, setIsLoading);
          await fetchDevicesFn();
          
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert('Success', ['Device added successfully'], 'success');
        } catch (folderError) {
          console.error('Error setting up default directory:', folderError);
          await banbury.sessions.failTask(
            taskInfo,
            'Failed to set up default directory',
            tasks,
            setTasks
          );
          showAlert('Error', ['Failed to set up default directory', folderError instanceof Error ? folderError.message : 'Unknown error'], 'error');
        }
      } else if (response?.result === 'error') {
        const errorMessage = response.message || 'Failed to add device';
        await banbury.sessions.failTask(
          taskInfo,
          errorMessage,
          tasks,
          setTasks
        );
        showAlert('Error', [errorMessage], 'error');
      } else {
        await banbury.sessions.failTask(
          taskInfo,
          'Invalid response from server',
          tasks,
          setTasks
        );
        showAlert('Error', ['Invalid response from server'], 'error');
      }
    } catch (error) {
      console.error('Error adding device:', error);
      try {
        if (!username) return;
        
        const errorTaskInfo = await banbury.sessions.addTask(
          'Error adding device',
          tasks,
          setTasks
        );
        await banbury.sessions.failTask(
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


