import React, { useState, useRef } from 'react';

import { Tooltip } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import { useAuth } from '../../../../../../renderer/context/AuthContext';
import { banbury } from '@banbury/core';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { useAlert } from '../../../../../../renderer/context/AlertContext';
import { addFileToSync } from '@banbury/core/src/device/addFileToSync';
// Extend the InputHTMLAttributes interface to include webkitdirectory and directory
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

export default function AddFileToSyncButton({ selectedFileNames }: { selectedFileNames: string[] }) {
  const [loading, setLoading] = useState(false);
  const { tasks, setTasks, setTaskbox_expanded } = useAuth();
  const { showAlert } = useAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFileToSync = async () => {
    if (!selectedFileNames || selectedFileNames.length === 0) {
      showAlert(
        'No Files Selected',
        ['Please select one or more files to add to sync'],
        'warning'
      );
      return;
    }

    setLoading(true);

    for (const file of selectedFileNames) {
      let taskInfo = null;
      try {
        // Add the selected folder as a scanned folder
        const task_description = `Adding file to sync: ${file}`;
        taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
        setTaskbox_expanded(true);

        const addResult = await addFileToSync(file);

        if (addResult === 'success') {
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
        } else {
          throw new Error(`Failed to add file: ${addResult}`);
        }
      } catch (error) {
        console.error('Error adding file to sync:', error);
        // Update task status to failed if task was created
        if (taskInfo) {
          await banbury.sessions.failTask(
            taskInfo,
            tasks,
            setTasks,
            error instanceof Error ? error.message : 'Unknown error occurred'
          );
        }
        // Show error notification
        showAlert(
          'Error Adding File to Sync',
          [error instanceof Error ? error.message : 'An unknown error occurred while adding file to sync']
        );
      }
    }

    try {
      setLoading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error cleaning up:', error);
      setLoading(false); // Ensure loading state is reset even if cleanup fails
      showAlert(
        'Error Cleaning Up',
        ['Failed to clean up after file sync operation']
      );
    }
  };

  return (
    <Tooltip title="Add to Sync">
      <LoadingButton
        onClick={handleAddFileToSync}
        data-testid="add-file-to-sync-button"
        loading={loading}
        loadingPosition="end"
        sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
      >
        <CloudUploadOutlinedIcon
          fontSize="inherit"
        />
      </LoadingButton>
    </Tooltip>
  );
}
