import React, { useState, useRef } from 'react';
import { Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LoadingButton from '@mui/lab/LoadingButton';
import { useAuth } from '../../../../../../renderer/context/AuthContext';
import { useAlert } from '../../../../../../renderer/context/AlertContext';
import banbury from '@banbury/core';
import { removeFileFromSync } from '@banbury/core/src/device/removeFileFromSync';

export default function RemoveFileFromSyncButton({ selectedFileNames, onFinish }: { selectedFileNames: string[], onFinish: () => void }) {
  const [loading, setLoading] = useState(false);
  const {tasks, setTasks, setTaskbox_expanded, updates, setUpdates } = useAuth();
  const { showAlert } = useAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleRemoveFileFromSync = async () => {
    if (!selectedFileNames.length) {
      showAlert('No Files Selected', ['Please select files to remove from sync'], 'warning');
      return;
    }

    setLoading(true);
    const errors: string[] = [];

    try {
      for (const file of selectedFileNames) {
        try {
          const task_description = `Removing file from sync: ${file}`;
          const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
          setTaskbox_expanded(true);

          const removeResult = await removeFileFromSync(file);

          if (removeResult === 'success') {
            await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
            setUpdates(updates + 1);
          } else {
            throw new Error(`Failed to remove ${file} from sync`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : `Failed to remove ${file} from sync`;
          errors.push(errorMessage);
          console.error('Error removing file:', error);
        }
      }

      if (errors.length > 0) {
        showAlert('Error Removing Files', errors, 'error');
      } else {
        showAlert('Success', ['Files successfully removed from sync'], 'success');
      }
    } finally {
      setLoading(false);
      onFinish();
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  return (
    <Tooltip title="Remove from File Sync">
      <LoadingButton
        onClick={handleRemoveFileFromSync}
        loading={loading}
        loadingPosition="end"
        sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
      >
        <DeleteIcon
          fontSize="inherit"
        />
      </LoadingButton>
    </Tooltip>
  );
}
