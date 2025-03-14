import { banbury } from "@banbury/core";
import { useAuth } from "../../../context/AuthContext";
import { useAlert } from "../../../context/AlertContext";
import { Button, Tooltip } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import React from "react";
import { handlers } from "../../../handlers";

interface DeleteFileButtonProps {
  selectedFileNames: string[];
  filePath: string;
  setSelectedFileNames: (files: string[]) => void;
  updates: number;
  setUpdates: (updates: number) => void;
  setSelected: (selected: readonly number[]) => void;
  setTaskbox_expanded: (expanded: boolean) => void;
  tasks: any[];
  setTasks: (tasks: any[]) => void;
}

export default function DeleteFileButton({
  selectedFileNames,
  filePath,
  setSelectedFileNames,
  updates,
  setUpdates,
  setSelected,
  setTaskbox_expanded,
  tasks,
  setTasks,
}: DeleteFileButtonProps) {
  const { username } = useAuth();
  const { showAlert } = useAlert();

  const handleDeleteClick = async () => {
    try {
      if (selectedFileNames.length === 0) {
        showAlert('No file selected', ['Please select one or more files to delete'], 'warning');
        return;
      }

      const task_description = 'Deleting ' + selectedFileNames.join(', ');
      const taskInfo = await banbury.sessions.addTask(username ?? '', task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const response = await handlers.files.deleteFile(
        setSelectedFileNames,
        selectedFileNames,
        filePath,
        updates,
        setUpdates,
      ) as string;

      if (response === 'No file selected' || response === 'file_not_found') {
        await banbury.sessions.failTask(username ?? '', taskInfo, response, tasks, setTasks);
        showAlert(`Delete failed: ${response}`, ['error']);
      } else if (response === 'success') {
        await banbury.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
        showAlert('Delete completed successfully', ['success']);
      }

      setSelected([]);
    } catch (error) {
      console.error('Delete error:', error);
      showAlert('Delete failed. Please try again.', ['error']);
      setSelected([]);
    }
  };

  return (
    <Tooltip title="Delete">
      <Button
        onClick={handleDeleteClick}
        sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
      >
        <DeleteIcon fontSize="inherit" />
      </Button>
    </Tooltip>
  );
}
