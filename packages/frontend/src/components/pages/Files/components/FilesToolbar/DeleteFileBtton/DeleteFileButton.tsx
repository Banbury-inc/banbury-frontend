import { banbury } from "@banbury/core";
import { useAlert } from "../../../../../../renderer/context/AlertContext";
import { Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import React, { useState } from "react";
import { handlers } from "../../../../../../renderer/handlers";
import { deleteGoogleDriveFile } from "@banbury/core/src/files/googleDrive";

interface DeleteFileButtonProps {
  selectedFileNames: string[];
  selectedFileInfo: any[];
  filePath: string;
  setSelectedFileNames: (files: string[]) => void;
  updates: number;
  setUpdates: (updates: number) => void;
  setSelected: (selected: readonly (string | number)[]) => void;
  setTaskbox_expanded: (expanded: boolean) => void;
  tasks: any[];
  setTasks: (tasks: any[]) => void;
}

export default function DeleteFileButton({
  selectedFileNames,
  selectedFileInfo,
  filePath,
  setSelectedFileNames,
  updates,
  setUpdates,
  setSelected,
  setTaskbox_expanded,
  tasks,
  setTasks,
}: DeleteFileButtonProps) {
  const { showAlert } = useAlert();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Check if we're in Google Drive context
  const isGoogleDrive = filePath?.includes('Core/GoogleDrive') || filePath === 'GoogleDrive';

  const handleDeleteClick = () => {
    if (selectedFileNames.length === 0) {
      showAlert('No file selected', ['Please select one or more files to delete'], 'warning');
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmDialogOpen(false);
    
    try {
      const task_description = 'Deleting ' + selectedFileNames.join(', ');
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      let response: string = 'success';

      if (isGoogleDrive) {
        // Handle Google Drive file deletion
        try {
          const deletePromises = selectedFileInfo.map(async (fileInfo) => {
            const fileId = fileInfo.google_drive_id || fileInfo.id;
            if (!fileId) {
              throw new Error(`No Google Drive ID found for file: ${fileInfo.file_name}`);
            }
            
            const result = await deleteGoogleDriveFile(fileId.toString());
            if (result.error) {
              throw new Error(result.error);
            }
            return result;
          });

          await Promise.all(deletePromises);
          
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert('Delete completed successfully', [`Successfully deleted ${selectedFileNames.length} file(s) from Google Drive`], 'success');
          
          // Clear selections and trigger refresh
          setSelected([]);
          setSelectedFileNames([]);
          setUpdates(updates + 1);
          
        } catch (error) {
          console.error('Google Drive delete error:', error);
          await banbury.sessions.failTask(taskInfo, error instanceof Error ? error.message : 'Unknown error', tasks, setTasks);
          showAlert('Delete failed', [error instanceof Error ? error.message : 'Failed to delete Google Drive files'], 'error');
          setSelected([]);
        }
      } else {
        // Handle local file deletion (existing logic)
        response = await handlers.files.deleteFile(
          setSelectedFileNames,
          selectedFileNames,
          filePath,
          updates,
          setUpdates,
        ) as string;

        if (response === 'No file selected' || response === 'file_not_found') {
          await banbury.sessions.failTask(taskInfo, response, tasks, setTasks);
          showAlert(`Delete failed: ${response}`, ['Please try again'], 'error');
        } else if (response === 'success') {
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert('Delete completed successfully', [`Successfully deleted ${selectedFileNames.length} file(s)`], 'success');
        }

        setSelected([]);
      }
    } catch (error) {
      console.error('Delete error:', error);
      showAlert('Delete failed. Please try again.', [error instanceof Error ? error.message : 'Unknown error occurred'], 'error');
      setSelected([]);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDialogOpen(false);
  };

  const getDeleteMessage = () => {
    const fileCount = selectedFileNames.length;
    const fileText = fileCount === 1 ? 'file' : 'files';
    const location = isGoogleDrive ? 'Google Drive' : 'your device';
    
    return `Are you sure you want to delete ${fileCount} ${fileText} from ${location}? This action cannot be undone.`;
  };

  return (
    <>
      <Tooltip title={isGoogleDrive ? "Delete from Google Drive" : "Delete"}>
        <Button
          onClick={handleDeleteClick}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          <DeleteIcon fontSize="inherit" />
        </Button>
      </Tooltip>

      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {getDeleteMessage()}
          </DialogContentText>
          {selectedFileNames.length > 0 && (
            <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
              Files to delete:
            </DialogContentText>
          )}
          {selectedFileNames.map((fileName, index) => (
            <DialogContentText key={index} sx={{ ml: 2, fontSize: '0.875rem' }}>
              • {fileName}
            </DialogContentText>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
