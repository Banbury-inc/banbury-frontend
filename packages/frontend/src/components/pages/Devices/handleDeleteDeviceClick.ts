import banbury from '@banbury/core';
import { handlers } from '../../../renderer/handlers';
import { handleFetchDevices } from './handleFetchDevices';

export function handleDeleteDeviceClick(
  selectedDeviceNames: any,
  setSelectedDeviceNames: any,
  setTaskbox_expanded: any,
  setTasks: any,
  showAlert: any,
  tasks: any,
  setAllDevices: any,
  setFirstname: any,
  setIsLoading: any,
  setLastname: any,
  username: string | null
) {
  const handleDeleteDevice = async () => {
    if (!selectedDeviceNames.length) {
      showAlert('Warning', ['Please select one or more devices to delete'], 'warning');
      return;
    }

    try {
      const task_description = 'Deleting device ' + selectedDeviceNames.join(', ');
      const taskInfo = await banbury.sessions.addTask(username ?? '', task_description, tasks, setTasks);
      console.log('taskInfo', taskInfo);
      setTaskbox_expanded(true);

      const result = await banbury.device.delete_device(username ?? '');
      console.log('result', result);

      if (result === 'success') {
        handleFetchDevices(selectedDeviceNames, setSelectedDeviceNames, setAllDevices, setFirstname, setIsLoading, setLastname, username);
        await banbury.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
        setSelectedDeviceNames([]);
        showAlert('Success', ['Device(s) deleted successfully'], 'success');
      } else {
        await banbury.sessions.failTask(
          username ?? '',
          taskInfo,
          'Failed to delete device',
          tasks,
          setTasks
        );
        showAlert('Error', ['Failed to delete device(s)'], 'error');
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      try {
        const errorTaskInfo = await banbury.sessions.addTask(
          username ?? '',
          'Error deleting device',
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
        showAlert('Error', ['Failed to delete device(s)', error instanceof Error ? error.message : 'Unknown error'], 'error');
      } catch (taskError) {
        console.error('Failed to create error task:', taskError);
        showAlert('Error', ['Failed to create error task', taskError instanceof Error ? taskError.message : 'Unknown error'], 'error');
      }
    }
  };
  return handleDeleteDevice;
}


