import React, { useState, useRef } from 'react';

interface NewScannedFolderButtonProps {
  fetchDevices: () => Promise<void>;
}
import { Tooltip } from '@mui/material';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import LoadingButton from '@mui/lab/LoadingButton';
import { useAuth } from '../../../../../renderer/context/AuthContext';
import banbury from '@banbury/core';
import { addScannedFolder } from '@banbury/core/src/device/addScannedFolder';
import path from 'path';
// Extend the InputHTMLAttributes interface to include webkitdirectory and directory
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

export default function AddScannedFolderButton({ fetchDevices }: NewScannedFolderButtonProps) {
  const [loading, setLoading] = useState(false);
  const {tasks, setTasks, setTaskbox_expanded } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    setLoading(true);
    try {
      // Get the folder path from the first file
      const absoluteFolderPath = path.dirname(file.path);

      // Add the selected folder as a scanned folder
      const task_description = `Adding scanned folder: ${absoluteFolderPath}`;
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const addResult = await addScannedFolder(absoluteFolderPath);

      if (addResult === 'success') {
        await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
        // Trigger a refresh of the devices to reflect the new folder
        await fetchDevices(); // Use the passed fetchDevices function
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    } finally {
      setLoading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFolderSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Tooltip title="Add Scanned Folder">
      <LoadingButton
        onClick={triggerFolderSelect}
        loading={loading}
        loadingPosition="end"
        sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
      >
        <CreateNewFolderOutlinedIcon
          fontSize="inherit" />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFolderSelect}
          style={{ display: 'none' }}
          webkitdirectory=""
          directory=""
        />
      </LoadingButton>
    </Tooltip>
  );
}
