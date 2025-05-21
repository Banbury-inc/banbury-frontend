import banbury from '@banbury/core';

export function handleDeleteDeviceClick(
  selectedDevice: any,
  selectedDeviceNames: any,
  setSelectedDeviceNames: any,
  setTaskbox_expanded: any,
  setTasks: any,
  showAlert: any,
  tasks: any,
  setAllDevices: any,
  setIsLoading: any,
  setSelectedDevice?: any
) {
  const handleDeleteDevice = async () => {
    try {
      if (!selectedDeviceNames.length) {
        showAlert('Warning', ['Please select one or more devices to delete'], 'warning');
        return;
      }

      const task_description = 'Deleting device ' + selectedDeviceNames.join(', ');
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const result = await banbury.device.deleteDevice(selectedDeviceNames);

      if (Array.isArray(result) && result.every(r => r === 'success')) {
        if (setSelectedDevice) {
          setSelectedDevice(null);
        }
        
        await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
        setSelectedDeviceNames([]);
        showAlert('Success', ['Device(s) deleted successfully'], 'success');

        // Call fetchDevices function and await its result to ensure it completes before proceeding
        const fetchDevicesFn = banbury.device.getDeviceData(selectedDeviceNames[0], setSelectedDevice, setAllDevices, setIsLoading);
        await fetchDevicesFn();

      } else {
        await banbury.sessions.failTask(
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
          'Error deleting device',
          tasks,
          setTasks
        );
        await banbury.sessions.failTask(
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


