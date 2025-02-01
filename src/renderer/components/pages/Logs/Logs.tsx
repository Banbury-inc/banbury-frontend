import AddToQueueIcon from '@mui/icons-material/AddToQueue';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import DevicesIcon from '@mui/icons-material/Devices';
import DownloadIcon from '@mui/icons-material/Download';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import GrainIcon from '@mui/icons-material/Grain';
import NavigateBeforeOutlinedIcon from '@mui/icons-material/NavigateBeforeOutlined';
import NavigateNextOutlinedIcon from '@mui/icons-material/NavigateNextOutlined';
import { CardContent, Container, Divider, Skeleton, useMediaQuery, LinearProgress } from '@mui/material';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs'; import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
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
import path, { join } from 'path';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { handlers } from '../../../handlers';
import { neuranet } from '../../../neuranet';
import AccountMenuIcon from '../../common/AccountMenuIcon';
import { FileBreadcrumbs } from './components/FileBreadcrumbs';
import { DatabaseData, Order } from './types/index';


import SyncIcon from '@mui/icons-material/Sync';
import AddFileToSyncButton from '../../common/add_file_to_sync_button';
import { EnhancedTableProps, HeadCell } from './types';
import { UseLogData } from './hooks/newUseLogData';
import Rating from '@mui/material/Rating';
import { CONFIG } from '../../../config/config';
import NotificationsButton from '../../common/notifications/NotificationsButton';


const getHeadCells = (isCloudSync: boolean): HeadCell[] => [
  { id: 'task_name', numeric: false, label: 'Name' },
  { id: 'task_device', numeric: false, label: 'Device' },
  { id: 'task_status', numeric: false, label: 'Status' },
  { id: 'task_date_added', numeric: false, label: 'Date Added' },
  { id: 'task_date_modified', numeric: false, label: 'Date Modified' },
];

type LogData = {
  task_name: string;
  task_device: string;
  task_status: string;
  task_progress: string;
};

function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const isSmallScreen = useMediaQuery('(max-width:960px)');
  const { global_file_path } = useAuth();
  const isCloudSync = global_file_path?.includes('Cloud Sync') ?? false;
  const headCells = getHeadCells(isCloudSync);
  const createSortHandler = (property: keyof LogData) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {headCells
          .filter((headCell: HeadCell) => {
            return true;

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
                onClick={createSortHandler(headCell.id as keyof LogData)}
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

export default function Logs() {
  const isSmallScreen = useMediaQuery('(max-width:960px)');
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof DatabaseData>('file_name');
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [selectedDeviceNames, setSelectedDeviceNames] = useState<string[]>([]);
  const [selectedFileInfo, setSelectedFileInfo] = useState<any[]>([]);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [dense, setDense] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const { global_file_path, global_file_path_device, setGlobal_file_path, websocket } = useAuth();
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [disableFetch, setDisableFetch] = useState(false);
  const {
    updates,
    setUpdates,
    tasks,
    setTasks,
    username,
    sync_files,
    first_name,
    last_name,
    devices,
    setFirstname,
    setLastname,
    setDevices,
    setSyncFiles,
    redirect_to_login,
    setRedirectToLogin,
    taskbox_expanded,
    setTaskbox_expanded,
  } = useAuth();
  const getSelectedFileNames = () => {
    return selected
      .map((id) => {
        const file = logs.find((file: any) => file.id === id);
        return file ? file.task_name : null;
      })
      .filter((file_name) => file_name !== null); // Filter out any null values if a file wasn't found
  };


  let { isLoading, logs, setLogs } = UseLogData(
    username,
    disableFetch,
    updates,
    global_file_path,
    global_file_path_device,
    setFirstname,
    setLastname,
    devices,
    setDevices,
  );


  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof DatabaseData) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = logs.map((n: any) => n.id);
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
    const file_name = logs.find((file: any) => file.id === id)?.task_name;
    const newSelectedFileNames = newSelected
      .map((id) => logs.find((file: any) => file.id === id)?.task_name)
      .filter((name) => name !== undefined) as string[];
    console.log(newSelectedFileNames);
    const newSelectedFilePaths = newSelected
      .map((id) => logs.find((file: any) => file.id === id)?.task_device)
      .filter((name) => name !== undefined) as string[];
    console.log(newSelectedFilePaths[0]);
    const directoryName = 'BCloud';
    const directoryPath = join(os.homedir(), directoryName);
    let fileFound = false;
    let folderFound = false;
    let filePath = '';
    try {
      const fileStat = await stat(newSelectedFilePaths[0]);
      if (fileStat.isFile()) {
        fileFound = true;
        console.log(`File '${file_name}' found in directory.`);
      }
      if (fileStat.isDirectory()) {
        folderFound = true;
        setGlobal_file_path(newSelectedFilePaths[0]);
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

        let task_description = 'Opening ' + selectedFileNames.join(', ');
        let taskInfo = await neuranet.sessions.addTask(username ?? '', task_description, tasks, setTasks);
        setTaskbox_expanded(true);
        let response = await handlers.files.downloadFile(
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
          let task_result = await neuranet.sessions.failTask(username ?? '', taskInfo, response, tasks, setTasks);
        }
        if (response === 'File not available') {
          let task_result = await neuranet.sessions.failTask(username ?? '', taskInfo, response, tasks, setTasks);
        }
        if (response === 'success') {
          let task_result = await neuranet.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
          const directory_name: string = 'BCloud';
          const directory_path: string = path.join(os.homedir(), directory_name);
          const file_save_path: string = path.join(directory_path, file_name ?? '');
          shell.openPath(file_save_path);

          // Create a file watcher
          const watcher = fs.watch(file_save_path, (eventType, filename) => {
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




  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  // Avoid a layout jump when reaching the last page with empty rows.
  // Calculate empty rows for pagination
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - logs.length) : 0;

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


    let task_description = 'Updating File Priority';
    let taskInfo = await neuranet.sessions.addTask(username ?? '', task_description, tasks, setTasks);
    setTaskbox_expanded(true);

    const newPriority = newValue;

    const result = await neuranet.files.updateFilePriority(row._id, username ?? '', newPriority);

    if (result === 'success') {
      let task_result = await neuranet.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
      setUpdates(updates + 1);
    }



  };

  const isCloudSync = global_file_path?.includes('Cloud Sync') ?? false;
  const headCells = getHeadCells(isCloudSync);





  return (
    // <Box sx={{ width: '100%', pl: 4, pr: 4, mt: 0, pt: 5 }}>
    <Box sx={{ width: '100%', pt: 0 }}>
      <Card variant="outlined" sx={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
        <CardContent sx={{ paddingBottom: '2px !important', paddingTop: '46px' }}>
          <Stack spacing={2} direction="row" sx={{ flexWrap: 'nowrap' }}>
            <Grid container justifyContent="flex-end" alignItems="flex-end">
              <Grid item></Grid>
              <Grid item>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                  <Stack direction="row">
                    <NotificationsButton />
                  </Stack>
                  <Stack paddingLeft={1} direction="row">
                    <AccountMenuIcon />
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
      <Stack direction="row" spacing={0} sx={{ width: '100%', height: 'calc(100vh - 76px)', overflow: 'hidden' }}>
        <Stack>
          <Box display="flex" flexDirection="column" height="100%">

          </Box>
        </Stack>
        <Card variant="outlined" sx={{ flexGrow: 1, height: '100%', width: '100%', overflow: 'hidden' }}>
          <CardContent sx={{ height: '100%', width: '100%', overflow: 'hidden', padding: 0 }}>
            <FileBreadcrumbs />
            {logs.length === 0 ? (
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
                    rowCount={logs.length}
                  />
                  <TableBody>
                    {isLoading
                      ? Array.from(new Array(rowsPerPage)).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
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
                      : stableSort(logs, getComparator(order, orderBy))
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((row, index) => {
                          const isItemSelected = isSelected(row._id as string);
                          const labelId = `enhanced-table-checkbox-${index}`;
                          return (
                            <TableRow
                              hover
                              role="checkbox"
                              aria-checked={isItemSelected}
                              tabIndex={-1}
                              key={row._id}
                              selected={isItemSelected}
                              onMouseEnter={() => setHoveredRowId(row._id as string)}
                              onMouseLeave={() => setHoveredRowId(null)}
                            >
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
                                  {row.task_name}
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
                                {row.task_device}
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
                                {row.task_status}
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
                                {row.task_date_added}
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
                                {row.task_date_modified}
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
                  count={logs.length}
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
