import React from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import CardContent from '@mui/material/CardContent';
import Tooltip from '@mui/material/Tooltip';
import NavigateBackButton from './NavigateBackButton/NavigateBackButton';
import NavigateForwardButton from './NavigateForwardButton/NavigateForwardButton';
import NewInputFileUploadButton from './UploadFileButton/UploadFileButton';
import DownloadFileButton from './DownloadFileButton/DownloadFileButton';
import DeleteFileButton from './DeleteFileBtton/DeleteFileButton';
import AddToButton from './AddToButton/AddToButton';
import SyncButton from './SyncButton/SyncButton';
import ShareFileButton from './ShareFileButton/ShareFileButton';
import ToggleColumnsButton from './ToggleColumnsButton/ToggleColumnsButton';
import ChangeViewButton from './ChangeViewButton/ChangeViewButton';

export default function FilesToolbar({
  _backHistory,
  setBackHistory,
  _forwardHistory,
  setForwardHistory,
  filePath,
  setFilePath,
  setTaskbox_expanded,
  selectedFileNames,
  selectedFileInfo,
  selectedDeviceNames,
  setSelectedFileNames,
  setSelected,
  tasks,
  setTasks,
  websocket,
  updates,
  setUpdates,
  handleShareModalOpen,
  getColumnOptions,
  handleColumnVisibilityChange,
  viewType,
  setViewType,
}: any) {

  return (
    <CardContent sx={{ paddingTop: '8px !important', paddingBottom: '4px !important' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Grid container alignItems="center">
          <Grid item>
            <NavigateBackButton
              backHistory={_backHistory}
              setBackHistory={setBackHistory}
              filePath={filePath}
              setFilePath={setFilePath}
              setForwardHistory={setForwardHistory}
            />
          </Grid>
          <Grid item>
            <NavigateForwardButton
              backHistory={_backHistory}
              setBackHistory={setBackHistory}
              forwardHistory={_forwardHistory}
              setForwardHistory={setForwardHistory}
              filePath={filePath}
              setFilePath={setFilePath}
            />
          </Grid>
          <Grid item paddingRight={1} paddingLeft={1}>
            <Tooltip title="Upload">
              <NewInputFileUploadButton />
            </Tooltip>
          </Grid>
          <Grid item paddingRight={1}>
            <DownloadFileButton
              selectedFileNames={selectedFileNames}
              selectedFileInfo={selectedFileInfo}
              selectedDeviceNames={selectedDeviceNames}
              setSelectedFiles={setSelectedFileNames}
              setSelected={setSelected}
              setTaskbox_expanded={setTaskbox_expanded}
              tasks={tasks || []}
              setTasks={setTasks}
              websocket={websocket}
            />
          </Grid>
          <Grid item paddingRight={1}>
            <AddToButton
              selectedFileNames={selectedFileNames}
              selectedFileInfo={selectedFileInfo}
              filePath={filePath}
              onUploadComplete={() => {
                setUpdates(Date.now());
              }}
            />
          </Grid>
          <Grid item paddingRight={1}>
            <DeleteFileButton
              selectedFileNames={selectedFileNames}
              selectedFileInfo={selectedFileInfo}
              filePath={filePath}
              setSelectedFileNames={setSelectedFileNames}
              updates={updates}
              setUpdates={setUpdates}
              setSelected={setSelected}
              setTaskbox_expanded={setTaskbox_expanded}
              tasks={tasks || []}
              setTasks={setTasks}
            />
          </Grid>
          <Grid item paddingRight={1}>
            <SyncButton />
          </Grid>
          <Grid item paddingRight={1}>
            <ShareFileButton
              selectedFileNames={selectedFileNames}
              selectedFileInfo={selectedFileInfo}
              onShare={() => handleShareModalOpen()}
            />
          </Grid>
          <Grid item paddingRight={1}>
            <ToggleColumnsButton
              columnOptions={getColumnOptions()}
              onColumnVisibilityChange={handleColumnVisibilityChange}
            />
          </Grid>
          <Grid item>
            <ChangeViewButton currentView={viewType} onViewChange={setViewType} />
          </Grid>
        </Grid>
      </Stack>
    </CardContent>
  );
}
