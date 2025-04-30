import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { CardContent } from '@mui/material';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { shell } from 'electron';
import fs from 'fs';
import { stat } from 'fs/promises';
import os from 'os';
import path from 'path';
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../renderer/context/AuthContext';
import { useAlert } from '../../../renderer/context/AlertContext';
import { handlers } from '../../../renderer/handlers';
import banbury from '@banbury/core';
import FileTreeView from './components/NewTreeView/FileTreeView';
import NewInputFileUploadButton from './components/UploadFileButton';
import { fetchDeviceData } from '@banbury/core/src/device/fetchDeviceData';
import { FileBreadcrumbs } from './components/FileBreadcrumbs';
import { DatabaseData, Order } from './types/index';
import ShareFileButton from '../../../components/common/ShareFileButton/ShareFileButton';
import AddFileToSyncButton from '../../../components/common/AddFileToSyncButton';
import Dialog from '@mui/material/Dialog';
import SyncButton from '../../../components/common/SyncButton/SyncButton';
import DownloadFileButton from '../../../components/common/DownloadFileButton/DownloadFileButton';
import DeleteFileButton from '../../../components/common/DeleteFileBtton/DeleteFileButton';
import { styled } from '@mui/material/styles';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderIcon from '@mui/icons-material/Folder';
import ChangeViewButton, { ViewType as FileViewType } from './components/ChangeViewButton/ChangeViewButton';
import ToggleColumnsButton from './components/ToggleColumnsButton/ToggleColumnsButton';
import { formatFileSize } from './utils/formatFileSize';
import FileTable from './components/Table/Table';
import NavigateBackButton from './components/NavigateBackButton/NavigateBackButton';
import NavigateForwardButton from './components/NavigateForwardButton/NavigateForwardButton';
import _ViewSelector from './components/ViewSelector/ViewSelector';
import { useAllFileData } from './hooks/useAllFileData';
import RemoveFileFromSyncButton from '../Sync/components/remove_file_from_sync_button/remove_file_from_sync_button';
import S3UploadButton from './components/S3UploadButton';

const ResizeHandle = styled('div')(({ theme }) => ({
  position: 'absolute',
  right: -4,
  top: 0,
  bottom: 0,
  width: 8,
  cursor: 'col-resize',
  zIndex: 1000,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 4,
    width: 2,
    backgroundColor: theme.palette.primary.main,
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  '&:hover::after': {
    opacity: 1,
    transition: 'opacity 0.2s ease 0.15s',
  },
  '&.dragging::after': {
    opacity: 1,
    transition: 'none',
  }
}));

export default function Files() {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof DatabaseData>('file_name');
  const [selected, setSelected] = useState<readonly (string | number)[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [selectedDeviceNames, setSelectedDeviceNames] = useState<string[]>([]);
  const [selectedFileInfo, setSelectedFileInfo] = useState<any[]>([]);
  const [hoveredRowId, setHoveredRowId] = useState<string | number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const { websocket } = useAuth();
  const { showAlert } = useAlert();
  const {
    updates,
    setUpdates,
    tasks,
    setTasks,
    username,
    files,
    sync_files,
    devices,
    setFirstname,
    setLastname,
    setPhoneNumber: _setPhoneNumber,
    setEmail: _setEmail,
    setDevices,
    setPicture: _setPicture,
    setTaskbox_expanded,
  } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [fileTreeWidth, setFileTreeWidth] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const [viewType, setViewType] = useState<FileViewType>('list');
  const [filePathDevice, setFilePathDevice] = useState('');
  const [filePath, setFilePath] = useState<string>('');
  const [_backHistory, setBackHistory] = useState<string[]>([]);
  const [_forwardHistory, setForwardHistory] = useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<{ [key: string]: boolean }>({
    file_name: true,
    file_size: true,
    kind: true,
    device_name: true,
    available: true,
    file_priority: true,
    date_uploaded: true,
    is_public: true,
    original_device: true,
    owner: true,
    date_modified: true
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartX.current;
        const newWidth = Math.max(100, Math.min(600, dragStartWidth.current + deltaX));
        setFileTreeWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = fileTreeWidth;
  };

  const getCurrentContext = (): 'files' | 'sync' | 'shared' | 'cloud' => {
    if (filePath.includes('Core/Sync') || filePath === 'Sync') {
      return 'sync';
    } else if (filePath.includes('Core/Shared') || filePath === 'Shared') {
      return 'shared';
    } else if (filePath.includes('Core/Cloud') || filePath === 'Cloud') {
      return 'cloud';
    }
    return 'files';
  };

  const currentContext = getCurrentContext();

  const { isLoading, fileRows } = useAllFileData(
    username,
    filePath,
    filePathDevice,
    currentContext,
    setFirstname,
    setLastname,
    files,
    sync_files,
    devices || [],
    setDevices
  );

  useEffect(() => {
    const fetchAndUpdateDevices = async () => {
      const new_devices = await fetchDeviceData(username || '');
      setDevices(Array.isArray(new_devices) ? new_devices : []);
    };

    fetchAndUpdateDevices();
  }, []);

  useEffect(() => {
    setSelected([]);
    setSelectedFileNames([]);
    setSelectedDeviceNames([]);
    setSelectedFileInfo([]);
  }, [filePath]);

  const handleRequestSort = (_event: React.MouseEvent<unknown>, property: keyof DatabaseData) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = fileRows.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleFileNameClick = async (id: string | number) => {
    const selectedIndex = selected.indexOf(id);
    let _newSelected: readonly (string | number)[] = [];

    if (selectedIndex === -1) {
      _newSelected = _newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      _newSelected = _newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      _newSelected = _newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      _newSelected = _newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    }
    
    const file = fileRows.find((file) => file.id === id);
    if (!file) return;
    
    const file_name = file.file_name;
    const file_path = file.file_path;
    
    // Special handling for S3 files
    if (file.is_s3) {
      try {
        const task_description = 'Downloading ' + file_name;
        const taskInfo = await banbury.sessions.addTask(username ?? '', task_description, tasks, setTasks);
        setTaskbox_expanded(true);
        
        // Use the direct save function instead of browser download
        await banbury.files.saveS3FileToBCloud(
          username ?? '',
          file.id.toString(),
          file_name
        );
        
        await banbury.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
        
        showAlert('Download completed successfully', [`The file "${file_name}" has been downloaded successfully`], 'success');
        return;
      } catch (error) {
        console.error('Error downloading S3 file:', error);
        showAlert('Download failed', [`Failed to download "${file_name}". Please try again.`], 'error');
        return;
      }
    }
    
    let fileFound = false;
    let folderFound = false;
    
    try {
      if (file_path) {
        const fileStat = await stat(file_path);
        if (fileStat.isFile()) {
          fileFound = true;
        }
        if (fileStat.isDirectory()) {
          folderFound = true;
          setFilePath(file_path);
        }
      }
      
      if (fileFound) {
        shell.openPath(file_path);
      }
      
      if (!fileFound && !folderFound) {
        console.error(`File '${file_name}' not found in directory, searching other devices`);

        const task_description = 'Opening ' + selectedFileNames.join(', ');
        const taskInfo = await banbury.sessions.addTask(username ?? '', task_description, tasks, setTasks);
        setTaskbox_expanded(true);
        const response = await handlers.files.downloadFile(
          username ?? '',
          selectedFileNames,
          selectedDeviceNames,
          selectedFileInfo,
          taskInfo,
          websocket as unknown as WebSocket,
        );
        
        if (response === 'No file selected') {
          await banbury.sessions.failTask(username ?? '', taskInfo, response, tasks, setTasks);
          showAlert('No file selected', ['Please select a file to download'], 'warning');
        }
        if (response === 'file_not_found') {
          await banbury.sessions.failTask(username ?? '', taskInfo, 'File not found', tasks, setTasks);
          showAlert('File not found', [`The file "${file_name}" could not be found on the selected device.`], 'error');
        }
        if (response === 'File not available') {
          await banbury.sessions.failTask(username ?? '', taskInfo, response, tasks, setTasks);
          showAlert('File not available', ['The selected file is not currently available for download.'], 'error');
        }
        if (response === 'success') {
          await banbury.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
          const directory_name: string = 'BCloud';
          const directory_path: string = path.join(os.homedir(), directory_name);
          const file_save_path: string = path.join(directory_path, file_name ?? '');
          shell.openPath(file_save_path);

          // Create a file watcher
          const watcher = fs.watch(file_save_path, (eventType: string) => {
            if (eventType === 'rename' || eventType === 'change') {
              // The file has been closed, so we can delete it
              watcher.close(); // Stop watching the file

              fs.unlink(file_save_path, (err: any) => {
                if (err) {
                  console.error('Error deleting file:', err);
                }
              });
            }
          });
        }
      }
    } catch (err) {
      console.error('Error searching for file:', err);
      showAlert('Error', ['An error occurred while accessing the file.'], 'error');
    }
  };
  
  const handleClick = (event: React.MouseEvent<unknown> | React.ChangeEvent<HTMLInputElement>, id: string | number) => {
    event.stopPropagation();
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly (string | number)[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    }
    setSelected(newSelected);

    const newSelectedFileNames = newSelected
      .map((id) => fileRows.find((file) => file.id === id)?.file_name)
      .filter((name) => name !== undefined) as string[];
    const newSelectedDeviceNames = newSelected
      .map((id) => fileRows.find((file) => file.id === id)?.device_name)
      .filter((name) => name !== undefined) as string[];
    setSelectedFileNames(newSelectedFileNames);
    setSelectedDeviceNames(newSelectedDeviceNames);
    // Get file info for selected files and update selectedFileInfo state
    const newSelectedFileInfo = newSelected
      .map((id) => fileRows.find((file) => file.id === id))
      .filter((file) => file !== undefined);
    setSelectedFileInfo(newSelectedFileInfo);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isSelected = (id: string | number) => selected.indexOf(id) !== -1;

  const handlePriorityChange = async (row: any, newValue: number | null) => {
    if (newValue === null) return;

    const task_description = 'Updating File Priority';
    const taskInfo = await banbury.sessions.addTask(username ?? '', task_description, tasks, setTasks);
    setTaskbox_expanded(true);

    const newPriority = newValue;

    const result = await banbury.files.updateFilePriority(row._id, username ?? '', newPriority);

    if (result === 'success') {
      await banbury.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
      setUpdates(updates + 1);
    }
  };

  const isCloudSync = filePath?.includes('Core/Sync') ?? false;
  const isShared = filePath?.includes('Core/Shared') ?? false;

  const handleShareModalOpen = () => {
    setIsShareModalOpen(true);
  };

  const handleShareModalClose = () => {
    setIsShareModalOpen(false);
  };

  const handleColumnVisibilityChange = (columnId: string, isVisible: boolean) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: isVisible
    }));
  };

  const getColumnOptions = () => {
    return [
      { id: 'file_name', label: 'Name', visible: columnVisibility.file_name },
      { id: 'file_size', label: 'Size', visible: columnVisibility.file_size },
      { id: 'kind', label: 'Kind', visible: columnVisibility.kind },
      { id: 'device_name', label: 'Location', visible: columnVisibility.device_name },
      { id: 'file_priority', label: 'Priority', visible: columnVisibility.file_priority },
      { id: 'available', label: 'Status', visible: columnVisibility.available },
      { id: 'date_uploaded', label: 'Date Uploaded', visible: columnVisibility.date_uploaded },
      //{ id: 'is_public', label: 'Visibility', visible: columnVisibility.is_public },
      // { id: 'original_device', label: 'Original Device', visible: columnVisibility.original_device },
      // { id: 'owner', label: 'Owner', visible: columnVisibility.owner },
      // { id: 'date_modified', label: 'Last Modified', visible: columnVisibility.date_modified }
    ];
  };
  
  const handleFinish = () => {
    setSelected([]);
    setSelectedFileNames([]);
    setUpdates(updates + 1);
  };

  return (
    <Box sx={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Card variant="outlined" sx={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
        <CardContent sx={{ paddingBottom: '4px !important', paddingTop: '8px !important' }}>
          <Stack spacing={2} direction="row" sx={{ flexWrap: 'nowrap' }}>
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
                  websocket={websocket as WebSocket}
                />
              </Grid>
              <Grid item paddingRight={1}>
                <S3UploadButton 
                  filePath={filePath}
                  onUploadComplete={() => setUpdates(updates + 1)}
                />
              </Grid>
              <Grid item paddingRight={1}>
                <DeleteFileButton
                  selectedFileNames={selectedFileNames}
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
              
              {!isShared && (
                <Grid item paddingRight={1}>
                  <Tooltip title="Add to Sync">
                    <AddFileToSyncButton selectedFileNames={selectedFileNames} />
                  </Tooltip>
                </Grid>
              )}
              
              {isCloudSync && (
                <Grid item paddingRight={1}>
                  <RemoveFileFromSyncButton
                    selectedFileNames={selectedFileNames}
                    onFinish={handleFinish}
                  />
                </Grid>
              )}
              
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
                <ChangeViewButton
                  currentView={viewType}
                  onViewChange={setViewType}
                />
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
      
      <Stack
        direction="row"
        spacing={0}
        sx={{
          width: '100%',
          height: '100%', // Take remaining height
          overflow: 'hidden'
        }}
      >
        <Stack
          sx={{
            position: 'relative',
            width: `${fileTreeWidth}px`,
            flexShrink: 0,
            height: '100%', // Full height
            transition: isDragging ? 'none' : 'width 0.3s ease',
          }}
        >
          <Card
            variant="outlined"
            sx={{
              height: '100%', // Full height
              overflow: 'hidden',
              borderLeft: 0,
              borderRight: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <CardContent sx={{
              height: '100%',
              p: 2,
              '&:last-child': { pb: 2 }, // Override MUI default padding
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{
                flexGrow: 1,
                overflow: 'auto',
                height: '100%'
              }}>
                <FileTreeView
                  filePath={filePath}
                  setFilePath={setFilePath}
                  filePathDevice={filePathDevice}
                  setFilePathDevice={setFilePathDevice}
                  setBackHistory={setBackHistory}
                  setForwardHistory={setForwardHistory}
                />
              </Box>
            </CardContent>
          </Card>
          <ResizeHandle
            className={isDragging ? 'dragging' : ''}
            onMouseDown={handleMouseDown}
          />
        </Stack>

        <Card
          variant="outlined"
          sx={{
            flexGrow: 1,
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <CardContent
            sx={{
              height: '100%',
              width: '100%',
              overflow: 'hidden',
              padding: 0,
              '&:last-child': { pb: 0 }, // Override MUI default padding
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="h-full flex flex-col">
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pl: 2,
                pr: 2,
                pt: 2,
                minHeight: 40,
                flexShrink: 0 // Prevent box from shrinking
              }}>
                <Box sx={{ flexGrow: 1 }}>
                  <FileBreadcrumbs filePath={filePath} setFilePath={setFilePath} />
                </Box>
              </Box>
              <Box sx={{ 
                flexGrow: 1, 
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease-in-out' // Smooth transition for view changes
              }}>
                {fileRows.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <FolderOpenIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h5" color="textSecondary">
                      No files available.
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {isCloudSync ? "No files are currently synced." :
                       isShared ? "No files have been shared with you." :
                       currentContext === 'cloud' ? "No files found in Cloud storage." :
                       "Please upload a file to get started."}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {viewType.includes('grid') ? (
                      <Box 
                        data-testid="file-list"
                        data-view={viewType}
                        sx={{
                          height: 'calc(100vh - 200px)',
                          overflow: 'auto',
                          px: 0.5,
                          transition: 'all 0.2s ease-in-out' // Smooth transition for view changes
                      }}>
                        <Grid container spacing={2} sx={{ p: 1.5 }}>
                          {fileRows.map((row) => {
                            const isItemSelected = isSelected(row.id);
                            return (
                              <Grid item xs={viewType === 'grid' ? 1.5 : 3} key={row.id}>
                                <Card
                                  data-testid="file-item"
                                  sx={{
                                    cursor: 'pointer',
                                    '&:hover': {
                                      bgcolor: 'action.hover',
                                      '& .selection-checkbox': {
                                        opacity: 1
                                      }
                                    },
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    border: isItemSelected ? '2px solid' : '1px solid',
                                    borderColor: isItemSelected ? 'primary.main' : 'divider'
                                  }}
                                  onClick={(event) => handleClick(event, row.id)}
                                >
                                  <Box
                                    className="selection-checkbox"
                                    sx={{
                                      position: 'absolute',
                                      top: 8,
                                      left: 8,
                                      opacity: isItemSelected ? 1 : 0,
                                      transition: 'opacity 0.2s',
                                      zIndex: 1
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Checkbox
                                      checked={isItemSelected}
                                      onChange={(event) => handleClick(event, row.id)}
                                      size="small"
                                    />
                                  </Box>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      p: 1,
                                      bgcolor: 'background.default',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      borderRadius: '8px',
                                      m: 1,
                                      minHeight: '60px'
                                    }}
                                  >
                                    {row.kind === 'Folder' ? (
                                      <FolderIcon sx={{ fontSize: 30, color: 'primary.main' }} />
                                    ) : (
                                      <InsertDriveFileIcon sx={{ fontSize: 30, color: 'text.secondary' }} />
                                    )}
                                  </Box>
                                  <CardContent sx={{ flexGrow: 1, pt: 0.5, px: 1.5, pb: 1 }}>
                                    <Typography variant="body2" noWrap>
                                      {row.file_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {formatFileSize(row.file_size)}
                                    </Typography>
                                    {!isCloudSync && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: row.available === 'Available'
                                            ? '#1DB954'
                                            : row.available === 'Unavailable'
                                              ? 'red'
                                              : 'inherit'
                                        }}
                                      >
                                        {row.available}
                                      </Typography>
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    ) : (
                      <FileTable
                        fileRows={fileRows}
                        isLoading={isLoading}
                        order={order}
                        orderBy={orderBy}
                        selected={selected}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        isCloudSync={isCloudSync}
                        hoveredRowId={hoveredRowId}
                        _devices={devices || []}
                        onRequestSort={handleRequestSort}
                        onSelectAllClick={handleSelectAllClick}
                        handleClick={handleClick}
                        handleFileNameClick={handleFileNameClick}
                        isSelected={isSelected}
                        setHoveredRowId={setHoveredRowId}
                        handlePriorityChange={handlePriorityChange}
                        columnVisibility={columnVisibility}
                        currentView={currentContext}
                      />
                    )}
                  </>
                )}
              </Box>
            </div>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={fileRows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </CardContent>
        </Card>
      </Stack>
      <Dialog
        open={isShareModalOpen}
        onClose={handleShareModalClose}
        maxWidth="sm"
        fullWidth
      >
      </Dialog>
    </Box>
  );
}
