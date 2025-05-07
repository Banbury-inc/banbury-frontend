import { banbury } from "@banbury/core";
import { useAuth } from "../../../renderer/context/AuthContext";
import { useAlert } from "../../../renderer/context/AlertContext";
import { Button, Tooltip } from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';
import React from "react";
import { handlers } from "../../../renderer/handlers";
import { addDownloadsInfo } from "@banbury/core/src/device/addDownloadsInfo";

export default function DownloadFileButton({
  selectedFileNames,
  selectedFileInfo,
  selectedDeviceNames,
  setSelected,
  setTaskbox_expanded,
  tasks,
  setTasks,
  websocket
}: {
  selectedFileNames: string[],
  selectedFileInfo: any[],
  selectedDeviceNames: string[],
  setSelectedFiles: (files: any[]) => void,
  setSelected: (selected: readonly (string | number)[]) => void,
  setTaskbox_expanded: (expanded: boolean) => void,
  tasks: any[],
  setTasks: (tasks: any[]) => void,
  websocket: WebSocket
}) {
  const { username } = useAuth();
  const { showAlert } = useAlert();

  const handleDownloadClick = async () => {
    if (selectedFileNames.length === 0) {
      showAlert('No file selected', ['Please select one or more files to download'], 'warning');
      return;
    }

    try {
      // Initialize download progress for selected files
      const initialDownloads = selectedFileInfo.map(fileInfo => ({
        filename: fileInfo.file_name,
        fileType: fileInfo.kind || 'Unknown',
        progress: 0,
        status: 'downloading' as const,
        totalSize: fileInfo.file_size || 0,
        downloadedSize: 0,
        timeRemaining: undefined
      }));

      // Add to downloads tracking
      addDownloadsInfo(initialDownloads);

      const task_description = 'Downloading ' + selectedFileNames.join(', ');
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      // Check if any selected file is an S3 file
      const hasS3Files = selectedFileInfo.some(file => file.is_s3 === true);

      if (hasS3Files) {
        // Handle S3 files download
        try {
          for (const file of selectedFileInfo) {
            if (file.is_s3) {
              // Use the new function that saves directly to BCloud directory
              await banbury.files.saveS3FileToBCloud(
                file.id.toString(),
                file.file_name
              );
            }
          }
          
          await banbury.sessions.completeTask(taskInfo, tasks, setTasks);

          // Update download status to 'completed' for all selected files
          const completedDownloadsUpdate = selectedFileInfo.map(fileInfo => ({
            filename: fileInfo.file_name,
            fileType: fileInfo.kind || 'Unknown',
            progress: 100,
            status: 'completed' as const,
            totalSize: fileInfo.file_size || 0,
            downloadedSize: fileInfo.file_size || 0,
            timeRemaining: undefined
          }));
          addDownloadsInfo(completedDownloadsUpdate); // Update the core download info
          

          showAlert('Download completed successfully', ['Your Cloud file has been downloaded successfully'], 'success');
          setSelected([]);
          return;
        } catch (error) {
          console.error('Error downloading S3 files:', error);
          await banbury.sessions.failTask(taskInfo, 'S3 download failed', tasks, setTasks);
          showAlert('Download failed', ['Failed to download S3 files. Please try again.'], 'error');
          setSelected([]);
          return;
        }
      }

      // Regular device files need websocket connection
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        showAlert('Connection Error', ['Not connected to server. Please try again.'], 'error');
        await banbury.sessions.failTask(taskInfo, 'Connection Error', tasks, setTasks);
        return;
      }

      // Add timeout promise with a much longer timeout (5 minutes instead of 30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Download request timed out after 5 minutes')), 300000); // 5 minute timeout
      });

      // Race between the download and timeout
      const response = await Promise.race([
        handlers.files.downloadFile(
          selectedFileNames,
          selectedDeviceNames,
          selectedFileInfo,
          taskInfo,
          websocket
        ),
        timeoutPromise
      ]);

      if (response === 'No file selected') {
        await banbury.sessions.failTask(taskInfo, response, tasks, setTasks);
        showAlert('No file selected', ['Please select a file to download'], 'warning');
      } else if (response === 'file_not_found') {
        await banbury.sessions.failTask(taskInfo, 'File not found', tasks, setTasks);
        showAlert('File not found', [`The file "${selectedFileNames[0]}" could not be found on the selected device.`], 'error');
      } else if (response === 'success') {
        await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
        showAlert('Download completed successfully', ['Your file has been downloaded successfully'], 'success');
      }

      setSelected([]);
    } catch (error) {
      console.error('Download error:', error);
      
      // Update download status to 'failed' for all selected files
      const failedDownloadsUpdate = selectedFileInfo.map(fileInfo => ({
        filename: fileInfo.file_name,
        fileType: fileInfo.kind || 'Unknown',
        progress: fileInfo.progress || 0, // Keep existing progress if available
        status: 'failed' as const,
        totalSize: fileInfo.file_size || 0,
        downloadedSize: fileInfo.downloadedSize || 0, // Keep existing downloaded size
        timeRemaining: undefined
      }));
      addDownloadsInfo(failedDownloadsUpdate); // Update the core download info

      // More specific error handling for alerts
      if (typeof error === 'string' && error === 'file_not_found') {
        showAlert('File not found', [`The file "${selectedFileNames[0]}" could not be found on the selected device.`], 'error');
      } else if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          showAlert('Download timed out', ['The download request timed out. Please try again.'], 'error');
        } else {
          showAlert('Download failed', [`Error: ${error.message}`], 'error');
        }
      } else {
        showAlert('Download failed', ['An unknown error occurred. Please try again.'], 'error');
      }
      
      setSelected([]);
    }
  };
  

  return (
    <Tooltip title={"Download"}>
      <span>
        <Button
          data-testid="download-button"
          onClick={handleDownloadClick}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          <DownloadIcon fontSize="inherit" />
        </Button>
      </span>
    </Tooltip>
  );
}
