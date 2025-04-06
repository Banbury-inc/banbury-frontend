export function handleTransferError(
  errorType: 'save_error' | 'file_not_found' | 'device_offline' | 'permission_denied' | 'transfer_failed',
  fileName: string,
  tasks: any[] | null,
  setTasks: ((tasks: any[]) => void) | null,
  setTaskbox_expanded: ((expanded: boolean) => void) | null,
  deviceName?: string
) {
  if (!tasks || !setTasks || !setTaskbox_expanded) {
    return;
  }

  const errorMessages = {
    save_error: `Failed to save file: ${fileName}`,
    file_not_found: `File not found: ${fileName}`,
    device_offline: `Device ${deviceName} is offline`,
    permission_denied: `Permission denied for file: ${fileName}`,
    transfer_failed: `Transfer failed for file: ${fileName}`,
  };

  const updatedTasks = tasks.map((task: any) =>
    task.file_name === fileName
      ? { ...task, status: 'error', error_message: errorMessages[errorType] }
      : task
  );

  setTasks(updatedTasks);
  setTaskbox_expanded(true);
}

// Add file sync error handling
export function handleFileSyncError(error: any, fileInfo: any, tasks: any[], setTasks: (tasks: any[]) => void, setTaskbox_expanded: (expanded: boolean) => void) {
  
  let errorType: 'save_error' | 'file_not_found' | 'device_offline' | 'permission_denied' | 'transfer_failed' = 'transfer_failed';
  
  if (error.code === 'ENOENT') {
    errorType = 'file_not_found';
  } else if (error.code === 'EACCES') {
    errorType = 'permission_denied';
  } else if (error.message?.includes('offline')) {
    errorType = 'device_offline';
  } else if (error.message?.includes('save')) {
    errorType = 'save_error';
  }

  handleTransferError(
    errorType,
    fileInfo.file_name,
    tasks,
    setTasks,
    setTaskbox_expanded
  );
} 