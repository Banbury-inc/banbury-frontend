import { neuranet } from "../../../neuranet";
import { useAuth } from "../../../context/AuthContext";
import { useAlert } from "../../../context/AlertContext";
import { Button, Tooltip } from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';
import React from "react";
import { handlers } from "../../../handlers";
import { addDownloadsInfo } from "../download_progress/add_downloads_info";

export default function DownloadFileButton({ 
  selectedFileNames, 
  selectedFileInfo, 
  selectedDeviceNames, 
  setSelectedFiles, 
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
      const taskInfo = await neuranet.sessions.addTask(username ?? '', task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      // Add timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Download request timed out')), 30000); // 30 second timeout
      });

      // Race between the download and timeout
      const response = await Promise.race([
        handlers.files.downloadFile(
          username ?? '',
          selectedFileNames,
          selectedDeviceNames,
          selectedFileInfo,
          taskInfo,
          tasks,
          setTasks,
          setTaskbox_expanded,
          websocket
        ),
        timeoutPromise
      ]);

      if (response === 'No file selected' || response === 'file_not_found') {
        await neuranet.sessions.failTask(username ?? '', taskInfo, response, tasks, setTasks);
        showAlert(`Download failed: ${response}`, ['error']);
      } else if (response === 'success') {
        await neuranet.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
        showAlert('Download completed successfully', ['success']);
      }

      setSelected([]);
    } catch (error) {
      console.error('Download error:', error);
      showAlert('Download failed. Please try again.', ['error']);
      setSelected([]);
    }
  };

  return (
    <Tooltip title="Download">
      <Button
        onClick={handleDownloadClick}
        //   disabled={selectedFileNames.length === 0}
      sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
    >
        <DownloadIcon fontSize="inherit" />
      </Button>
    </Tooltip>
  );
}
