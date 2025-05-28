import { banbury } from "@banbury/core";
import { useAlert } from "../../../../../../renderer/context/AlertContext";
import { Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import React, { useState } from "react";
import { handlers } from "../../../../../../renderer/handlers";
import { deleteGoogleDriveFile } from "@banbury/core/src/files/googleDrive";
import { removeFileFromSync } from "@banbury/core/src/device/removeFileFromSync";
import { deleteMultipleS3Files } from "@banbury/core/src/files/deleteS3File";
import { removeFiles } from "@banbury/core/src/files/removeFiles";

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

  // Determine the context based on file path and file info
  const getFileContext = () => {
    if (filePath?.includes('Core/GoogleDrive') || filePath === 'GoogleDrive') {
      return 'google_drive';
    } else if (filePath?.includes('Core/Cloud') || filePath === 'Cloud') {
      return 'cloud';
    } else if (filePath?.includes('Core/Sync') || filePath === 'Sync') {
      return 'sync';
    } else if (filePath?.includes('Core/Shared') || filePath === 'Shared') {
      return 'shared';
    } else if (filePath?.includes('Core/Devices') || selectedFileInfo.some(file => file.source === 'files')) {
      return 'devices';
    }
    return 'devices'; // Default to devices
  };

  const context = getFileContext();

  const handleDeleteClick = () => {
    // Check if any files are selected - different contexts use different arrays
    const hasSelectedFiles = selectedFileNames.length > 0 || selectedFileInfo.length > 0;
    
    if (!hasSelectedFiles) {
      showAlert('No file selected', ['Please select one or more files to delete'], 'warning');
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmDialogOpen(false);
    
    try {
      // Generate file names for task description - use selectedFileNames if available, otherwise extract from selectedFileInfo
      const fileNamesForTask = selectedFileNames.length > 0 
        ? selectedFileNames 
        : selectedFileInfo.map(file => file.file_name || file.name || 'Unknown file');
      
      const task_description = 'Deleting ' + fileNamesForTask.join(', ');
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      let response: string = 'success';

      switch (context) {
        case 'google_drive':
          await handleGoogleDriveDelete(taskInfo);
          break;
        case 'cloud':
          await handleCloudDelete(taskInfo);
          break;
        case 'sync':
          await handleSyncDelete(taskInfo);
          break;
        case 'shared':
          await handleSharedDelete(taskInfo);
          break;
        case 'devices':
        default:
          await handleDevicesDelete(taskInfo);
          break;
      }

      // Clear selections after successful deletion
      setSelected([]);
      setSelectedFileNames([]);
      setUpdates(updates + 1);

    } catch (error) {
      console.error('Delete error:', error);
      showAlert('Delete failed. Please try again.', [error instanceof Error ? error.message : 'Unknown error occurred'], 'error');
      setSelected([]);
    }
  };

  const handleGoogleDriveDelete = async (taskInfo: any) => {
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
      showAlert('Delete completed successfully', [`Successfully deleted ${selectedFileInfo.length} file(s) from Google Drive`], 'success');
      
      // Trigger data refresh
      setUpdates(updates + 1);

    } catch (error) {
      console.error('Google Drive delete error:', error);
      await banbury.sessions.failTask(taskInfo, error instanceof Error ? error.message : 'Unknown error', tasks, setTasks);
      showAlert('Delete failed', [error instanceof Error ? error.message : 'Failed to delete Google Drive files'], 'error');
      throw error;
    }
  };

  const handleCloudDelete = async (taskInfo: any) => {
    try {
      // For S3/Cloud files, use the dedicated S3 deletion API
      const s3Files = selectedFileInfo.filter(file => file.is_s3 || file.s3_url);
      
      if (s3Files.length > 0) {
        // Extract file IDs for S3 deletion
        const fileIds = s3Files.map(file => {
          // Handle different ID formats
          let fileId = file._id;
          if (typeof file.id === 'string' && file.id.includes('-')) {
            // For composite IDs like "s3-file-originalId-timestamp", extract the originalId part
            const parts = file.id.split('-');
            if (parts.length >= 3) {
              fileId = parts[2]; // Get the original ID part
            }
          }
          return fileId;
        });
        
        // Use the dedicated S3 deletion API
        const result = await deleteMultipleS3Files(fileIds);
        
        if (result.result === 'success' || result.result === 'partial_success') {
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert('Delete completed successfully', [`Successfully deleted ${s3Files.length} file(s) from Cloud`], 'success');
          
          // Trigger data refresh
          setUpdates(updates + 1);
        } else {
          throw new Error(`Failed to delete cloud files: ${result.message || 'Unknown error'}`);
        }
      } else {
        throw new Error('No valid cloud files found for deletion');
      }
      
    } catch (error) {
      console.error('Cloud delete error:', error);
      await banbury.sessions.failTask(taskInfo, error instanceof Error ? error.message : 'Unknown error', tasks, setTasks);
      showAlert('Delete failed', [error instanceof Error ? error.message : 'Failed to delete cloud files'], 'error');
      throw error;
    }
  };

  const handleSyncDelete = async (taskInfo: any) => {
    try {
      // For sync files, we remove them from sync (not delete the actual file)
      const errors: string[] = [];
      
      for (const fileName of selectedFileNames) {
        try {
          const removeResult = await removeFileFromSync(fileName);
          if (removeResult !== 'success') {
            errors.push(`Failed to remove ${fileName} from sync`);
          }
        } catch (error) {
          errors.push(`Error removing ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
      showAlert('Remove completed successfully', [`Successfully removed ${selectedFileNames.length} file(s) from sync`], 'success');
      
      // Trigger data refresh
      setUpdates(updates + 1);

    } catch (error) {
      console.error('Sync remove error:', error);
      await banbury.sessions.failTask(taskInfo, error instanceof Error ? error.message : 'Unknown error', tasks, setTasks);
      showAlert('Remove failed', [error instanceof Error ? error.message : 'Failed to remove files from sync'], 'error');
      throw error;
    }
  };

  const handleSharedDelete = async (taskInfo: any) => {
    try {
      // For shared files, we need to unshare them or remove them from the shared list
      // Since there's no existing unshare API, we'll use the removeFiles API
      // but specify that these are shared files
      const sharedFiles = selectedFileInfo.map(file => ({
        file_name: file.file_name,
        file_path: file.file_path,
        _id: file._id,
        device_name: file.device_name
      }));
      
      // Use the device name from the file info for shared files
      const device_name = sharedFiles[0]?.device_name || 'Unknown';
      const result = await banbury.files.removeFiles(device_name, sharedFiles);
      
      if (result === 'success') {
        await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
        showAlert('Remove completed successfully', [`Successfully removed ${selectedFileInfo.length} shared file(s)`], 'success');
        
        // Trigger data refresh
        setUpdates(updates + 1);
      } else {
        throw new Error(`Failed to remove shared files: ${result}`);
      }
      
    } catch (error) {
      console.error('Shared files remove error:', error);
      await banbury.sessions.failTask(taskInfo, error instanceof Error ? error.message : 'Unknown error', tasks, setTasks);
      showAlert('Remove failed', [error instanceof Error ? error.message : 'Failed to remove shared files'], 'error');
      throw error;
    }
  };

  const handleDevicesDelete = async (taskInfo: any) => {
    try {
      // For device files, we should remove them from the database rather than trying to delete from filesystem
      // since the files shown are database entries that may not exist at the expected local paths
      
      if (selectedFileInfo.length > 0) {
        // Use the database deletion API for device files
        const deviceFiles = selectedFileInfo.map(file => ({
          file_name: file.file_name,
          file_path: file.file_path,
          _id: file._id,
          device_name: file.device_name
        }));
        
        // Use the device name from the file info
        const device_name = deviceFiles[0]?.device_name || 'Unknown';
        const result = await removeFiles(device_name, deviceFiles) as string;
        
        if (result === 'success') {
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert('Delete completed successfully', [`Successfully deleted ${selectedFileInfo.length} file(s) from database`], 'success');
        } else {
          // Handle specific error cases with more informative messages
          let errorMessage = `Failed to delete device files: ${result}`;
          if (result === 'device not found') {
            errorMessage = 'Device not found. The device may have been removed or renamed.';
          } else if (result === 'no files were deleted') {
            errorMessage = 'No files were deleted. The files may have already been removed.';
          } else if (result === 'no files to delete') {
            errorMessage = 'No valid files found to delete.';
          } else if (result === 'invalid files format') {
            errorMessage = 'Invalid file format. Please try again.';
          } else if (result.includes('network error')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (result.includes('server error')) {
            errorMessage = `Server error: ${result}`;
          }
          throw new Error(errorMessage);
        }
      } else {
        // Fallback to the original filesystem deletion logic if no selectedFileInfo
        const response = await handlers.files.deleteFile(
          setSelectedFileNames,
          selectedFileNames,
          filePath,
          updates,
          setUpdates,
        ) as string;

        if (response === 'No file selected' || response === 'file_not_found') {
          await banbury.sessions.failTask(taskInfo, response, tasks, setTasks);
          showAlert(`Delete failed: ${response}`, ['Please try again'], 'error');
          throw new Error(response);
        } else if (response === 'success') {
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
          showAlert('Delete completed successfully', [`Successfully deleted ${selectedFileNames.length} file(s)`], 'success');
        } else {
          throw new Error(`Unexpected response: ${response}`);
        }
      }
      
    } catch (error) {
      console.error('Device files delete error:', error);
      await banbury.sessions.failTask(taskInfo, error instanceof Error ? error.message : 'Unknown error', tasks, setTasks);
      showAlert('Delete failed', [error instanceof Error ? error.message : 'Failed to delete device files'], 'error');
      throw error;
    }
  };

  const handleCancelDelete = () => {
    setConfirmDialogOpen(false);
  };

  const getDeleteMessage = () => {
    // Use the appropriate count based on what's available
    const fileCount = selectedFileNames.length > 0 ? selectedFileNames.length : selectedFileInfo.length;
    const fileText = fileCount === 1 ? 'file' : 'files';
    
    let location = '';
    let action = 'delete';
    
    switch (context) {
      case 'google_drive':
        location = 'Google Drive';
        break;
      case 'cloud':
        location = 'Cloud storage';
        break;
      case 'sync':
        location = 'sync';
        action = 'remove from';
        break;
      case 'shared':
        location = 'shared files';
        action = 'remove from';
        break;
      case 'devices':
      default:
        location = 'your device';
        break;
    }
    
    return `Are you sure you want to ${action} ${fileCount} ${fileText} ${action === 'delete' ? 'from' : ''} ${location}? ${action === 'delete' ? 'This action cannot be undone.' : ''}`;
  };

  const getButtonTooltip = () => {
    switch (context) {
      case 'google_drive':
        return "Delete from Google Drive";
      case 'cloud':
        return "Delete from Cloud";
      case 'sync':
        return "Remove from Sync";
      case 'shared':
        return "Remove from Shared";
      case 'devices':
      default:
        return "Delete";
    }
  };

  // Get file names for display - use selectedFileNames if available, otherwise extract from selectedFileInfo
  const getFileNamesForDisplay = () => {
    if (selectedFileNames.length > 0) {
      return selectedFileNames;
    }
    return selectedFileInfo.map(file => file.file_name || file.name || 'Unknown file');
  };

  const fileNamesForDisplay = getFileNamesForDisplay();

  return (
    <>
      <Tooltip title={getButtonTooltip()}>
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
          Confirm {context === 'sync' || context === 'shared' ? 'Remove' : 'Delete'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {getDeleteMessage()}
          </DialogContentText>
          {fileNamesForDisplay.length > 0 && (
            <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
              Files to {context === 'sync' || context === 'shared' ? 'remove' : 'delete'}:
            </DialogContentText>
          )}
          {fileNamesForDisplay.map((fileName, index) => (
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
            {context === 'sync' || context === 'shared' ? 'Remove' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}