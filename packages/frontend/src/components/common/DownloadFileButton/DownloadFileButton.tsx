import { banbury } from "@banbury/core";
import { useAuth } from "../../../renderer/context/AuthContext";
import { useAlert } from "../../../renderer/context/AlertContext";
import { Button, Tooltip } from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';
import React from "react";
import { handlers } from "../../../renderer/handlers";
import { addDownloadsInfo } from "@banbury/core/src/device/add_downloads_info";

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
  setSelected: (selected: readonly number[]) => void,
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

    // Check if websocket is connected
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      showAlert('Connection Error', ['Not connected to server. Please try again.'], 'error');
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
      const taskInfo = await banbury.sessions.addTask(username ?? '', task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      // Add timeout promise with a much longer timeout (5 minutes instead of 30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Download request timed out after 5 minutes')), 300000); // 5 minute timeout
      });

      // Race between the download and timeout
      const response = await Promise.race([
        handlers.files.downloadFile(
          username ?? '',
          selectedFileNames,
          selectedDeviceNames,
          selectedFileInfo,
          taskInfo,
          websocket
        ),
        timeoutPromise
      ]);

      if (response === 'No file selected' || response === 'file_not_found') {
        await banbury.sessions.failTask(username ?? '', taskInfo, response, tasks, setTasks);
        showAlert(`Download failed: ${response}`, ['error']);
      } else if (response === 'success') {
        await banbury.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
        showAlert('Download completed successfully', ['success']);
      }

      setSelected([]);
    } catch (error) {
      console.error('Download error:', error);
      
      // More specific error handling for alerts
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          showAlert('Download timed out', ['The download request timed out. Please try again.'], 'error');
        } else if (error.message.toLowerCase().includes('file not found')) {
          showAlert('Download failed', ['The requested file could not be found on any available device.'], 'error');
        } else {
          showAlert('Download failed', [`Error: ${error.message}`], 'error');
        }
      } else {
        showAlert('Download failed', ['An unknown error occurred. Please try again.'], 'error');
      }
      
      setSelected([]);
    }
  };

  // Disable button if websocket is not connected
  const isDisabled = !websocket || websocket.readyState !== WebSocket.OPEN || selectedFileNames.length === 0;

  return (
    <Tooltip title={isDisabled ? (selectedFileNames.length === 0 ? "Select files to download" : "Not connected") : "Download"}>
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
