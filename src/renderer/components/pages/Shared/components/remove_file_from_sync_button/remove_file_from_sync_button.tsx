import React, { useState, useRef } from 'react';
import { Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LoadingButton from '@mui/lab/LoadingButton';
import { useAuth } from '../../../../../context/AuthContext';
import { neuranet } from '../../../../../neuranet';


export default function RemoveFileFromSyncButton({ selectedFileNames, onFinish }: { selectedFileNames: string[], onFinish: () => void }) {
  const [loading, setLoading] = useState(false);
  const { username, tasks, setTasks, setTaskbox_expanded, updates, setUpdates } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleRemoveFileFromSync = async () => {
    console.log("selectedFileNames in remove_file_from_sync_button", selectedFileNames);
    setLoading(true);

    for (const file of selectedFileNames) {

      try {

        console.log("file", file);

        // Add the selected folder as a scanned folder
        const task_description = `Removing file from sync: ${file}`;
        const taskInfo = await neuranet.sessions.addTask(username ?? '', task_description, tasks, setTasks);
        setTaskbox_expanded(true);

        const removeResult = await neuranet.device.remove_file_from_sync(file, username ?? '');

        if (removeResult === 'success') {
          await neuranet.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
          setUpdates(updates + 1);
        }
      } catch (error) {
        console.error('Error selecting folder:', error);
      }
    }
    try {
      setLoading(false);
      onFinish();
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error setting loading to false:', error);
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
