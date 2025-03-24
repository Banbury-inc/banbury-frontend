import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { CardContent, Skeleton, useMediaQuery, LinearProgress } from '@mui/material';
import Box from '@mui/material/Box';
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
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import axios from 'axios';
import { shell } from 'electron';
import fs from 'fs';
import { stat } from 'fs/promises';
import os from 'os';
import path from 'path';
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../renderer/context/AuthContext';
import { handlers } from '../../../renderer/handlers';
import RemoveFileFromSyncButton from './components/remove_file_from_sync_button/remove_file_from_sync_button';
import FileTreeView from './components/NewTreeView/FileTreeView';
import { FileBreadcrumbs } from './components/FileBreadcrumbs';
import { DatabaseData, Order } from './types/index';
import { EnhancedTableProps, HeadCell } from './types';
import { newUseFileData } from './hooks/newUseFileData';
import Rating from '@mui/material/Rating';
import { styled } from '@mui/material/styles';
import banbury from '@banbury/core';

const getHeadCells = (): HeadCell[] => [
  { id: 'file_name', numeric: false, label: 'Name', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'file_size', numeric: false, label: 'Size', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'device_ids', numeric: false, label: 'Coverage', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'file_priority', numeric: false, label: 'Priority', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
];

function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const isSmallScreen = useMediaQuery('(max-width:960px)');
  const { global_file_path } = useAuth();
  const isCloudSync = global_file_path?.includes('Cloud Sync') ?? false;
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
            size='small'
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
          .filter((headCell: HeadCell) => {
            const isVisibleOnCurrentScreen = !isSmallScreen || headCell.isVisibleOnSmallScreen;

            if (isCloudSync) {
              // Show only these specific columns in Cloud Sync view
              const cloudSyncColumns = ['file_name', 'file_size', 'device_ids', 'file_priority'];
              return isVisibleOnCurrentScreen && cloudSyncColumns.includes(headCell.id);
            } else {
              // In regular view, show all except Cloud Sync specific columns
              return isVisibleOnCurrentScreen && headCell.isVisibleNotOnCloudSync;
            }
          })
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

export default function Sync() {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof DatabaseData>('file_name');
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [selectedDeviceNames, setSelectedDeviceNames] = useState<string[]>([]);
  const selectedFileInfo = selected.map((id) => syncRows.find((file: any) => file._id === id));
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const { global_file_path, global_file_path_device, setGlobal_file_path, websocket } = useAuth();
  const disableFetch = false;
  const {
    updates,
    setUpdates,
    tasks,
    setTasks,
    username,
    devices,
    setFirstname,
    setLastname,
    setTaskbox_expanded,
  } = useAuth();


  const { isLoading, syncRows } = newUseFileData(
    username,
    disableFetch,
    updates,
    global_file_path,
    global_file_path_device,
    setFirstname,
    setLastname,
    devices,
  );


  const handleFinish = () => {
    setSelected([]);
    setSelectedFileNames([]);
    setUpdates(updates + 1);
  };




  const handleRequestSort = (_event: React.MouseEvent<unknown>, property: keyof DatabaseData) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = syncRows.map((n: any) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleFileNameClick = async (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    }
    const file_name = syncRows.find((file: any) => file.id === id)?.file_name;
    const newSelectedFilePaths = newSelected
      .map((id) => syncRows.find((file: any) => file.id === id)?.file_path)
      .filter((name) => name !== undefined) as string[];
    let fileFound = false;
    let folderFound = false;
    try {
      const fileStat = await stat(newSelectedFilePaths[0]);
      if (fileStat.isFile()) {
        fileFound = true;
      }
      if (fileStat.isDirectory()) {
        folderFound = true;
        setGlobal_file_path(newSelectedFilePaths[0]);
      }
      if (fileFound) {
        // Send an IPC message to the main process to handle opening the file
        shell.openPath(newSelectedFilePaths[0]);
      }
      if (folderFound) {
        // Send an IPC message to the main process to handle opening the file
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


  const handleClick = (_event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly string[] = [];

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
      .map((id) => syncRows.find((file: any) => file._id === id)?.file_name)
      .filter((name) => name !== undefined) as string[];
    const newSelectedDeviceNames = newSelected
      .map((id) => syncRows.find((file: any) => file._id === id)?.device_name)
      .filter((name) => name !== undefined) as string[];
    setSelectedFileNames(newSelectedFileNames);
    setSelectedDeviceNames(newSelectedDeviceNames);
  };


  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  // Avoid a layout jump when reaching the last page with empty rows.
  // Calculate empty rows for pagination

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
    setTaskbox_expanded(true);

    const newPriority = newValue;

    const result = await banbury.files.updateFilePriority(row._id, username ?? '', newPriority);

    if (result === 'success') {
      setUpdates(updates + 1);
    }



  };


  const fetchUserInfo = async () => {
    try {
      const userInfoResponse = await axios.get<{
        first_name: string;
        last_name: string;
        phone_number: string;
        email: string;
      }>(`${banbury.config.url}/users/getuserinfo/${username}/`);

      const { first_name, last_name } = userInfoResponse.data;
      setFirstname(first_name);
      setLastname(last_name);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };


  useEffect(() => {
    fetchUserInfo();
  }, [username]);

  const [fileTreeWidth, setFileTreeWidth] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

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

  return (
    <Box sx={{ width: '100%', pt: 0 }}>
      <Card variant="outlined" sx={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
        <CardContent sx={{ paddingBottom: '4px !important', paddingTop: '8px' }}>
          <Stack spacing={2} direction="row" sx={{ flexWrap: 'nowrap' }}>
            <Grid container spacing={0} sx={{ display: 'flex', flexWrap: 'nowrap', pt: 0 }}>

              <Grid item paddingRight={1}>
                <RemoveFileFromSyncButton
                  selectedFileNames={selectedFileNames}
                  onFinish={handleFinish}
                />
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
      <Stack direction="row" spacing={0} sx={{ width: '100%', height: 'calc(100vh - 76px)', overflow: 'hidden' }}>
        <Stack
          sx={{
            position: 'relative',
            width: `${fileTreeWidth}px`,
            flexShrink: 0,
            transition: isDragging ? 'none' : 'width 0.3s ease',
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <Box display="flex" flexDirection="column" height="100%">
            <Card
              variant="outlined"
              sx={{
                flexGrow: 1,
                height: '100%',
                overflow: 'hidden',
                borderLeft: 0,
                borderRight: 0,
                borderRadius: 0,
              }}
            >
              <CardContent>
                <Grid container spacing={4} sx={{ flexGrow: 1, overflow: 'hidden', maxHeight: 'calc(100vh - 120px)' }}>
                  <Grid item sx={{ width: '100%' }}>
                    <FileTreeView />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
          <ResizeHandle
            className={isDragging ? 'dragging' : ''}
            onMouseDown={handleMouseDown}
          />
        </Stack>

        <Card variant="outlined" sx={{
          flexGrow: 1,
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          borderLeft: 0,
          borderRadius: 0,
        }}>
          <CardContent sx={{ height: '100%', width: '100%', overflow: 'hidden', padding: 0 }}>
            <FileBreadcrumbs />
            {isLoading ? (
              <TableContainer sx={{ maxHeight: 'calc(100vh - 180px)' }}>
                <Table aria-labelledby="tableTitle" size="small" stickyHeader>
                  <EnhancedTableHead
                    numSelected={selected.length}
                    order={order}
                    orderBy={orderBy}
                    onSelectAllClick={handleSelectAllClick}
                    onRequestSort={handleRequestSort}
                    rowCount={syncRows.length}
                  />
                  <TableBody>
                    {Array.from(new Array(rowsPerPage)).map((_, index) => (
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : syncRows.length === 0 ? (
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
                <TableContainer sx={{ maxHeight: 'calc(100vh - 180px)' }}> <Table aria-labelledby="tableTitle" size="small" stickyHeader>
                  <EnhancedTableHead
                    numSelected={selected.length}
                    order={order}
                    orderBy={orderBy}
                    onSelectAllClick={handleSelectAllClick}
                    onRequestSort={handleRequestSort}
                    rowCount={syncRows.length}
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
                      : stableSort(syncRows, getComparator(order, orderBy))
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((row, index) => {
                          const isItemSelected = isSelected(row._id as string);
                          const labelId = `enhanced-table-checkbox-${index}`;
                          return (
                            <TableRow
                              hover
                              onClick={(event) => handleClick(event, row._id as string)}
                              role="checkbox"
                              aria-checked={isItemSelected}
                              tabIndex={-1}
                              key={row._id}
                              selected={isItemSelected}
                              onMouseEnter={() => setHoveredRowId(row._id as string)}
                              onMouseLeave={() => setHoveredRowId(null)}
                            >
                              <TableCell sx={{ borderBottomColor: '#424242' }} padding="checkbox">
                                {hoveredRowId === row._id || isItemSelected ? (
                                  <Checkbox
                                    color="primary"
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
                                    handleFileNameClick(row._id as string);
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
                            </TableRow>
                          );
                        })}
                  </TableBody>
                </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50, 100]}
                  component="div"
                  count={syncRows.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
