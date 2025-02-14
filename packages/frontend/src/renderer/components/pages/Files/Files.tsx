import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { CardContent, Skeleton, LinearProgress } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { shell } from 'electron';
import fs from 'fs';
import { stat } from 'fs/promises';
import os from 'os';
import path from 'path';
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { handlers } from '../../../handlers';
import banbury from '@banbury/core';
import FileTreeView from './components/NewTreeView/FileTreeView';
import NewInputFileUploadButton from '../../newuploadfilebutton';
import { fetchDeviceData } from '@banbury/core/src/device/fetchDeviceData';
import { FileBreadcrumbs } from './components/FileBreadcrumbs';
import { DatabaseData, Order } from './types/index';
import ShareFileButton from '../../common/share_file_button/share_file_button';
import AddFileToSyncButton from '../../common/add_file_to_sync_button';
import { EnhancedTableProps, HeadCell } from './types';
import { newUseFileData } from './hooks/newUseFileData';
import Rating from '@mui/material/Rating';
import Dialog from '@mui/material/Dialog';
import SyncButton from '../../common/sync_button/sync_button';
import DownloadFileButton from '../../common/DownloadFileButton/DownloadFileButton';
import DeleteFileButton from '../../common/DeleteFileBtton/DeleteFileButton';
import { styled } from '@mui/material/styles';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderIcon from '@mui/icons-material/Folder';
// Rename the interface to avoid collision with DOM Notification

const getHeadCells = (): HeadCell[] => [
  { id: 'file_name', numeric: false, label: 'Name', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'file_size', numeric: false, label: 'Size', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'kind', numeric: false, label: 'Kind', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'device_name', numeric: false, label: 'Location', isVisibleOnSmallScreen: false, isVisibleNotOnCloudSync: true },
  { id: 'available', numeric: false, label: 'Status', isVisibleOnSmallScreen: false, isVisibleNotOnCloudSync: true },
  { id: 'device_ids', numeric: false, label: 'Coverage', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: false },
  { id: 'file_priority', numeric: false, label: 'Priority', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: false },
  // { id: 'shared_with', numeric: false, label: 'Shared With', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'is_public', numeric: false, label: 'Public', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'date_uploaded', numeric: true, label: 'Date Uploaded', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
];

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


function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const headCells = getHeadCells();
  const createSortHandler = (property: keyof DatabaseData) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell
          padding="checkbox"
          sx={{
            backgroundColor: 'background.paper',
          }}
        >
          <Checkbox
            size="small"
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{
              'aria-label': 'select all desserts',
            }}
          />
        </TableCell>
        {headCells
          .map((headCell: HeadCell, index: number) => (
            <TableCell
              key={`${headCell.id}-${index}`}
              align={headCell.numeric ? 'right' : 'left'}
              sortDirection={orderBy === headCell.id ? order : false}
              sx={{
                backgroundColor: 'background.paper',
              }}
            >
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={createSortHandler(headCell.id)}
              >
                {headCell.label}
                {orderBy === headCell.id ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            </TableCell>
          ))}
      </TableRow>
    </TableHead>
  );
}

// Add view type enum and interface
type ViewType = 'list' | 'grid' | 'large_grid' | 'large_list';

interface ViewOption {
  value: ViewType;
  label: string;
  icon: React.ReactNode;
}

const StyledMenu = styled(Menu)(() => ({
  '& .MuiPaper-root': {
    backgroundColor: '#000000',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    marginTop: 8,
    minWidth: 180,
    boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.3)',
    padding: '8px',
    '& .MuiMenuItem-root': {
      borderRadius: '8px',
      padding: '8px 12px',
      margin: '2px 0',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.08)'
      },
      '& .MuiSvgIcon-root': {
        marginRight: 12,
        fontSize: 20
      }
    }
  }
}));

export default function Files() {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof DatabaseData>('file_name');
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [selectedDeviceNames, setSelectedDeviceNames] = useState<string[]>([]);
  const [selectedFileInfo, setSelectedFileInfo] = useState<any[]>([]);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const { websocket } = useAuth();
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
  const [viewType, setViewType] = useState<ViewType>('list');
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null);
  const [filePathDevice, setFilePathDevice] = useState('');
  const [filePath, setFilePath] = useState<string>('');

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


  const { isLoading, fileRows } = newUseFileData(
    username,
    filePath,
    filePathDevice,
    setFirstname,
    setLastname,
    files,
    sync_files,
    devices,
    setDevices,
  );

  useEffect(() => {

  }, [files]);

  useEffect(() => {
    const fetchAndUpdateDevices = async () => {
      const new_devices = await fetchDeviceData(
        username || '',
      );

      if (new_devices) {
        setDevices(new_devices);
      }
    };

    fetchAndUpdateDevices();

  }, []);

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

  const handleFileNameClick = async (id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    }
    const file_name = fileRows.find((file) => file.id === id)?.file_name;
    const newSelectedFileNames = newSelected
      .map((id) => fileRows.find((file) => file.id === id)?.file_name)
      .filter((name) => name !== undefined) as string[];
    console.log(newSelectedFileNames);
    const newSelectedFilePaths = newSelected
      .map((id) => fileRows.find((file) => file.id === id)?.file_path)
      .filter((name) => name !== undefined) as string[];
    console.log(newSelectedFilePaths[0]);
    let fileFound = false;
    let folderFound = false;
    try {
      const fileStat = await stat(newSelectedFilePaths[0]);
      if (fileStat.isFile()) {
        fileFound = true;
        console.log(`File '${file_name}' found in directory.`);
      }
      if (fileStat.isDirectory()) {
        folderFound = true;
        setFilePath(newSelectedFilePaths[0]);
      }
      if (fileFound) {
        // Send an IPC message to the main process to handle opening the file
        console.log(`Opening file '${file_name}'...`);
        shell.openPath(newSelectedFilePaths[0]);
      }
      if (folderFound) {
        // Send an IPC message to the main process to handle opening the file
        console.log(`Opening folder '${file_name}'...`);
        // shell.openPath(newSelectedFilePaths[0]);
      }
      if (!fileFound && !folderFound) {
        console.error(`File '${file_name}' not found in directory, searhing other devices`);

        const task_description = 'Opening ' + selectedFileNames.join(', ');
        const taskInfo = await banbury.sessions.addTask(username ?? '', task_description, tasks, setTasks);
        setTaskbox_expanded(true);
        const response = await handlers.files.downloadFile(
          username ?? '',
          selectedFileNames,
          selectedDeviceNames,
          selectedFileInfo,
          taskInfo,
          tasks || [],
          setTasks,
          setTaskbox_expanded,
          websocket as unknown as WebSocket,
        );
        if (response === 'No file selected') {
          await banbury.sessions.failTask(username ?? '', taskInfo, response, tasks, setTasks);
        }
        if (response === 'File not available') {
          await banbury.sessions.failTask(username ?? '', taskInfo, response, tasks, setTasks);
        }
        if (response === 'success') {
          await banbury.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
          const directory_name: string = 'BCloud';
          const directory_path: string = path.join(os.homedir(), directory_name);
          const file_save_path: string = path.join(directory_path, file_name ?? '');
          shell.openPath(file_save_path);

          // Create a file watcher
          const watcher = fs.watch(file_save_path, (eventType) => {
            if (eventType === 'rename' || eventType === 'change') {
              // The file has been closed, so we can delete it
              watcher.close(); // Stop watching the file

              fs.unlink(file_save_path, (err) => {
                if (err) {
                  console.error('Error deleting file:', err);
                } else {
                  console.log(`File ${file_save_path} successfully deleted.`);
                }
              });
            }
          });
        }
      }
    } catch (err) {
      console.error('Error searching for file:', err);
    }
  };
  const handleClick = (event: React.MouseEvent<unknown> | React.ChangeEvent<HTMLInputElement>, id: number) => {
    event.stopPropagation();
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly number[] = [];

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

    console.log(newSelected)
    const newSelectedFileNames = newSelected
      .map((id) => fileRows.find((file) => file.id === id)?.file_name)
      .filter((name) => name !== undefined) as string[];
    const newSelectedDeviceNames = newSelected
      .map((id) => fileRows.find((file) => file.id === id)?.device_name)
      .filter((name) => name !== undefined) as string[];
    setSelectedFileNames(newSelectedFileNames);
    setSelectedDeviceNames(newSelectedDeviceNames);
    console.log(newSelectedFileNames);
    console.log(selectedFileNames);
    // Get file info for selected files and update selectedFileInfo state
    const newSelectedFileInfo = newSelected
      .map((id) => fileRows.find((file) => file.id === id))
      .filter((file) => file !== undefined);
    setSelectedFileInfo(newSelectedFileInfo);
    console.log(newSelectedFileInfo);
  };



  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;


  function stableSort<T>(array: T[], comparator: (a: T, b: T) => number): T[] {
    return array
      .map((el, index) => ({ el, index })) // Attach the original index to each element
      .sort((a, b) => {
        const order = comparator(a.el, b.el);
        if (order !== 0) return order; // If elements are not equal, sort them according to `comparator`
        return a.index - b.index; // If elements are equal, sort them according to their original position
      })
      .map(({ el }) => el); // Extract the sorted elements
  }

  function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key,
  ): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }

  function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  }

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

  const isCloudSync = filePath?.includes('Cloud Sync') ?? false;

  const handleShareModalOpen = () => {
    setIsShareModalOpen(true);
  };

  const handleShareModalClose = () => {
    setIsShareModalOpen(false);
  };




  // Add view options
  const viewOptions: ViewOption[] = [
    { value: 'list', label: 'List', icon: <ViewListIcon fontSize="small" /> },
    { value: 'grid', label: 'Grid', icon: <GridViewIcon fontSize="small" /> },
    { value: 'large_grid', label: 'Large grid', icon: <GridViewIcon /> },
  ];

  // Add handlers
  const handleViewMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setViewMenuAnchor(event.currentTarget);
  };

  const handleViewMenuClose = () => {
    setViewMenuAnchor(null);
  };

  const handleViewChange = (newView: ViewType) => {
    setViewType(newView);
    handleViewMenuClose();
  };



  return (
    <Box sx={{
      width: '100%',
      height: '100vh', // Fill full viewport height
      display: 'flex',
      flexDirection: 'column'
    }}>

      <Card variant="outlined" sx={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
        <CardContent sx={{ paddingBottom: '4px !important', paddingTop: '8px !important' }}>
          <Stack spacing={2} direction="row" sx={{ flexWrap: 'nowrap' }}>
            <Grid container justifyContent="flex-start" alignItems="flex-start">
              <Grid item>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                  <Grid item paddingRight={1}>
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
                  <Grid item paddingRight={1} paddingLeft={0}>
                    <Tooltip title="Add to Sync">
                      <AddFileToSyncButton selectedFileNames={selectedFileNames} />
                    </Tooltip>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: 2 }}>
                    <Tooltip title="Change view">
                      <Button
                        onClick={handleViewMenuOpen}
                        sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
                      >
                        {viewType.includes('grid') ?
                          <GridViewIcon fontSize="inherit" /> :
                          <ViewListIcon fontSize="inherit" />
                        }
                      </Button>
                    </Tooltip>
                  </Box>
                  <StyledMenu
                    anchorEl={viewMenuAnchor}
                    open={Boolean(viewMenuAnchor)}
                    onClose={handleViewMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    {viewOptions.map((option) => (
                      <MenuItem
                        key={option.value}
                        onClick={() => handleViewChange(option.value)}
                        selected={viewType === option.value}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          color: 'text.primary',
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.12)'
                            }
                          }
                        }}
                      >
                        {option.icon}
                        <Typography variant="body2">{option.label}</Typography>
                      </MenuItem>
                    ))}
                  </StyledMenu>
                </Box>
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
                minHeight: 40
              }}>
                <Box sx={{ flexGrow: 1 }}>
                  <FileBreadcrumbs filePath={filePath} setFilePath={setFilePath} />
                </Box>
              </Box>
              {fileRows.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <FolderOpenIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h5" color="textSecondary">
                    No files available.
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Please upload a file to get started.
                  </Typography>
                </Box>
              ) : (
                <>
                  {viewType.includes('grid') ? (
                    <Box sx={{
                      height: 'calc(100vh - 180px)',
                      overflow: 'auto',
                      px: 0.5 // Add slight padding to account for scrollbar
                    }}>
                      <Grid container spacing={2} sx={{ p: 2 }}>
                        {fileRows.map((row) => {
                          const isItemSelected = isSelected(row.id as number);
                          return (
                            <Grid item xs={viewType === 'grid' ? 2.4 : 4} key={row.id}>
                              <Card
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
                                onClick={(event) => handleClick(event, row.id as number)}
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
                                    onChange={(event) => handleClick(event, row.id as number)}
                                    size="small"
                                  />
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    p: 2,
                                    bgcolor: 'background.default',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '8px',
                                    m: 1.5,
                                    minHeight: '120px'
                                  }}
                                >
                                  {row.kind === 'Folder' ? (
                                    <FolderIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                                  ) : (
                                    <InsertDriveFileIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                                  )}
                                </Box>
                                <CardContent sx={{ flexGrow: 1, pt: 1, px: 2, pb: 2 }}>
                                  <Typography variant="body2" noWrap>
                                    {row.file_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {row.file_size}
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
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 100px)' }}> <Table aria-labelledby="tableTitle" size="small" stickyHeader>
                      <EnhancedTableHead
                        numSelected={selected.length}
                        order={order}
                        orderBy={orderBy}
                        onSelectAllClick={handleSelectAllClick}
                        onRequestSort={handleRequestSort}
                        rowCount={fileRows.length}
                      />
                      <TableBody>
                        {isLoading
                          ? Array.from(new Array(rowsPerPage)).map((_, index) => (
                            <TableRow key={`skeleton-${index}`}>
                              <TableCell padding="checkbox">
                                <Skeleton variant="rectangular" width={24} height={24} />
                              </TableCell>
                              <TableCell>
                                <Skeleton variant="text" width="100%" />
                              </TableCell>
                              <TableCell>
                                <Skeleton variant="text" width="100%" />
                              </TableCell>
                              <TableCell>
                                <Skeleton variant="text" width="100%" />
                              </TableCell>
                              <TableCell>
                                <Skeleton variant="text" width="100%" />
                              </TableCell>
                              <TableCell>
                                <Skeleton variant="text" width="100%" />
                              </TableCell>
                              <TableCell>
                                <Skeleton variant="text" width="100%" />
                              </TableCell>
                            </TableRow>
                          ))
                          : stableSort(fileRows, getComparator(order, orderBy))
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((row, index) => {
                              const isItemSelected = isSelected(row.id as number);
                              const labelId = `enhanced-table-checkbox-${index}`;

                              return (
                                <TableRow
                                  hover
                                  onClick={(event) => handleClick(event, row.id as number)}
                                  role="checkbox"
                                  aria-checked={isItemSelected}
                                  tabIndex={-1}
                                  key={row.id}
                                  selected={isItemSelected}
                                  onMouseEnter={() => setHoveredRowId(row.id as number)} // Track hover state
                                  onMouseLeave={() => setHoveredRowId(null)} // Clear hover state
                                >
                                  <TableCell sx={{ borderBottomColor: '#424242' }} padding="checkbox">
                                    {hoveredRowId === row.id || isItemSelected ? ( // Only render Checkbox if row is hovered
                                      <Checkbox
                                        color="primary"
                                        size="small"
                                        checked={isItemSelected}
                                        inputProps={{ 'aria-labelledby': labelId }}
                                      />
                                    ) : null}
                                  </TableCell>

                                  <TableCell
                                    sx={{
                                      borderBottomColor: '#424242',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                    component="th"
                                    id={labelId}
                                    scope="row"
                                    padding="normal"
                                  >
                                    <ButtonBase
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleFileNameClick(row.id as number);
                                      }}
                                      style={{ textDecoration: 'none' }}
                                    >
                                      {row.file_name}
                                    </ButtonBase>
                                  </TableCell>

                                  <TableCell
                                    align="left"
                                    padding="normal"
                                    sx={{
                                      borderBottomColor: '#424242',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {row.file_size}
                                  </TableCell>

                                  {(!isCloudSync) && (
                                    <TableCell
                                      align="left"
                                      sx={{
                                        borderBottomColor: '#424242',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {row.kind}
                                    </TableCell>
                                  )}

                                  {(!isCloudSync) && (
                                    <TableCell
                                      align="left"
                                      sx={{
                                        borderBottomColor: '#424242',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {row.device_name}
                                    </TableCell>
                                  )}

                                  {(!isCloudSync) && (
                                    <TableCell
                                      align="left"
                                      padding="normal"
                                      sx={{
                                        borderBottomColor: '#424242',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        color:
                                          row.available === 'Available'
                                            ? '#1DB954'
                                            : row.available === 'Unavailable'
                                              ? 'red'
                                              : 'inherit', // Default color is 'inherit'
                                      }}
                                    >
                                      {row.available}
                                    </TableCell>
                                  )}

                                  <TableCell
                                    align="left"
                                    padding="normal"
                                    sx={{
                                      borderBottomColor: '#424242',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {row.is_public ? 'Public' : 'Private'}
                                  </TableCell>

                                  {isCloudSync && (
                                    <TableCell
                                      align="left"
                                      padding="normal"
                                      onClick={(e) => e.stopPropagation()}
                                      sx={{
                                        borderBottomColor: '#424242',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        width: '75%',
                                        position: 'relative',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',  // Add subtle white border
                                        borderRadius: '2px',  // Optional: slight rounding of corners
                                      }}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={(Array.isArray(row.device_ids) ? (row.device_ids.length / (devices?.length || 1)) * 100 : 0)}
                                          sx={{
                                            flexGrow: 1,
                                            height: 16,
                                            backgroundColor: 'transparent',
                                            borderRadius: '1px',  // Match the outer border radius
                                            '& .MuiLinearProgress-bar': {
                                              backgroundColor: () => {
                                                const percentage = Array.isArray(row.device_ids) ? (row.device_ids.length / (devices?.length || 1)) * 100 : 0;
                                                if (percentage >= 80) return '#1DB954';
                                                if (percentage >= 50) return '#CD853F';
                                                return '#FF4444';
                                              }
                                            }
                                          }}
                                        />
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            position: 'absolute',
                                            width: '100%',
                                            textAlign: 'center',
                                            color: '#ffffff',
                                            mixBlendMode: 'normal'
                                          }}
                                        >
                                          {Array.isArray(row.device_ids) ?
                                            `${((row.device_ids.length / (devices?.length || 1)) * 100).toFixed(2)}%` :
                                            '0%'
                                          }
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                  )}

                                  {isCloudSync && (
                                    <TableCell
                                      align="left"
                                      padding="normal"
                                      onClick={(e) => e.stopPropagation()}
                                      sx={{
                                        borderBottomColor: '#424242',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      <Rating
                                        name={`priority-${row.id}`}
                                        value={Number(row.file_priority)}
                                        max={5}
                                        onChange={(_event, newValue) => handlePriorityChange(row, newValue)}
                                        sx={{
                                          fontSize: '16px',
                                          '& .MuiRating-iconFilled': {
                                            color: () => {
                                              const priority = Number(row.file_priority);
                                              if (priority >= 4) return '#FF9500';
                                              if (priority === 3) return '#FFCC00';
                                              return '#1DB954';
                                            }
                                          }
                                        }}
                                      />
                                    </TableCell>
                                  )}

                                  {(!isCloudSync) && (
                                    <TableCell
                                      padding="normal"
                                      align="right"
                                      sx={{
                                        borderBottomColor: '#424242',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {row.date_uploaded}
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                      </TableBody>
                    </Table>
                    </TableContainer>
                  )}
                </>
              )}
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
