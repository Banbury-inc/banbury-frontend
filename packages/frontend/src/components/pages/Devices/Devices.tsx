import React, { useEffect, useState, useRef } from 'react';
import Stack from '@mui/material/Stack';
import { Switch, useMediaQuery } from '@mui/material';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Chip from '@mui/material/Chip';
import TableBody from '@mui/material/TableBody';
import DevicesIcon from '@mui/icons-material/Devices';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import { Skeleton } from '@mui/material';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Checkbox from '@mui/material/Checkbox';
import { LineChart } from '@mui/x-charts/LineChart';
import { visuallyHidden } from '@mui/utils';
import { CardContent, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import ScannedFoldersChips from './components/ScannedFoldersChips';
import { styled } from '@mui/material/styles';
import AddScannedFolderButton from './components/ScannedFolderButton/AddScannedFolderButton';
import { useAuth } from '../../../renderer/context/AuthContext';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import { handlers } from '../../../renderer/handlers';
import banbury from '@banbury/core';
import { formatRAM } from '../../../../../core/src/utils';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useAlert } from '../../../renderer/context/AlertContext';
import { handleAddDeviceClick } from './components/AddDeviceButton/handleAddDeviceClick';
import { DeviceData } from './types';
import AddDeviceButton from './components/AddDeviceButton/AddDeviceButton';
import DeleteDeviceButton from './components/DeleteDeviceButton/DeleteDeviceButton';

const headCells: HeadCell[] = [
  { id: 'device_name', numeric: false, label: 'Name', isVisibleOnSmallScreen: true },
];

type Order = 'asc' | 'desc';

interface HeadCell {
  disablePadding?: boolean;
  id: keyof DeviceData;
  label: string;
  numeric: boolean;
  isVisibleOnSmallScreen: boolean;
}

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof DeviceData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  order: Order;
  orderBy: keyof DeviceData;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const isSmallScreen = useMediaQuery('(max-width:960px)');
  const createSortHandler = (property: keyof DeviceData) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
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
          .filter(headCell => !isSmallScreen || headCell.isVisibleOnSmallScreen)
          .map(headCell => (
            <TableCell
              key={headCell.id}
              align={headCell.numeric ? 'right' : 'left'}
              sortDirection={orderBy === headCell.id ? order : false}
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

// Add this utility function at the top of the file, outside of any component
function formatSpeed(speed: number | string): string {
  if (typeof speed === 'number') {
    const speedInMbps = speed / 1000000; // Convert bits to megabits
    return `${speedInMbps.toFixed(2)} Mbps`;
  }
  return speed as string; // If it's not a number, return as is (e.g., 'N/A')
}


// Add this utility function at the top of the file, outside of any component
function formatStorageCapacity(capacity: string | number): string {
  if (typeof capacity === 'number') {
    const capacityInGB = capacity; // Convert MB to GB
    return `${capacityInGB.toFixed(2)} GB`;
  } else if (typeof capacity === 'string' && !isNaN(parseFloat(capacity))) {
    const capacityInGB = parseFloat(capacity); // Convert MB to GB
    return `${capacityInGB.toFixed(2)} GB`;
  }
  return capacity as string; // If it's not a number or valid numeric string, return as is (e.g., 'N/A')
}

// Add this utility function at the top of the file, outside of any component
function formatTimeLabel(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

export default function Devices() {
  const order = 'asc';
  const orderBy = 'device_name';
  const [isLoading, setIsLoading] = useState(true);
  const page = 0;
  const rowsPerPage = 10;
  const [allDevices, setAllDevices] = useState<DeviceData[]>([]);
  const [selectedDeviceNames, setSelectedDeviceNames] = useState<string[]>([]);
  const { updates, setUpdates, tasks, setTasks, username, setTaskbox_expanded } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('cpu');
  const { showAlert } = useAlert();

  // Add this new state for managing tabs
  const [selectedTab, setSelectedTab] = useState(0);

  // Add this function to handle tab changes
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const [deviceListWidth, setDeviceListWidth] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartX.current;
        const newWidth = Math.max(100, Math.min(600, dragStartWidth.current + deltaX));
        setDeviceListWidth(newWidth);
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
    dragStartWidth.current = deviceListWidth;
  };

  const [timeseriesData, setTimeseriesData] = useState<any[]>([]);
  const [isTimeseriesLoading, setIsTimeseriesLoading] = useState(false);

  useEffect(() => {
    const fetchTimeseriesData = async () => {
      if (!selectedDevice || !selectedDevice._id) {
        setTimeseriesData([]);
        return;
      }
      setIsTimeseriesLoading(true);
      try {
        const res = await banbury.device.getTimeseriesData(selectedDevice._id);
        setTimeseriesData(res);
      } catch (e) {
        setTimeseriesData([]);
      } finally {
        setIsTimeseriesLoading(false);
      }
    };
    fetchTimeseriesData();
  }, [selectedDevice]);

  const metricOptions = [
    { value: 'gpu', label: 'GPU Usage' },
    { value: 'ram', label: 'RAM Usage' },
    { value: 'cpu', label: 'CPU Usage' },
    { value: 'storage_capacity_gb', label: 'Storage Capacity (GB)' },
    { value: 'battery_status', label: 'Battery Status' },
    { value: 'battery_time_remaining', label: 'Battery Time Remaining' },
    { value: 'ram_total', label: 'Total RAM' },
    { value: 'ram_free', label: 'Free RAM' },
    { value: 'upload_speed', label: 'Upload Speed' },
    { value: 'download_speed', label: 'Download Speed' },
  ];

  const getMetricSeries = (metric: string) => {
    if (!timeseriesData.length) return [];
    switch (metric) {
      case 'cpu':
        return timeseriesData.map((d) => Number(d.cpu_usage));
      case 'ram':
        return timeseriesData.map((d) => Number(d.ram_usage));
      case 'gpu':
        return timeseriesData.map((d) => Number(d.gpu_usage));
      case 'storage_capacity_gb':
        return timeseriesData.map((d) => Number(d.storage_capacity_gb));
      case 'battery_status':
        return timeseriesData.map((d) => Number(d.battery_status));
      case 'battery_time_remaining':
        return timeseriesData.map((d) => Number(d.battery_time_remaining));
      case 'ram_total':
        return timeseriesData.map((d) => Number(d.ram_total));
      case 'ram_free':
        return timeseriesData.map((d) => Number(d.ram_free));
      case 'upload_speed':
        return timeseriesData.map((d) => Number(d.upload_speed));
      case 'download_speed':
        return timeseriesData.map((d) => Number(d.download_speed));
      default:
        return [];
    }
  };

  useEffect(() => {
    const fetchDevicesFunc = banbury.device.getDeviceData(selectedDevice, setSelectedDevice, setAllDevices, setIsLoading);
    fetchDevicesFunc();
  }, [username, updates]);


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

  function getComparator<Key extends keyof DeviceData>(
    order: Order,
    orderBy: Key,
  ): (
    a: DeviceData,
    b: DeviceData,
  ) => number {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }

  function descendingComparator<T extends DeviceData>(
    a: T,
    b: T,
    orderBy: keyof T,
  ) {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  }

  const handleDeviceClick = (device: DeviceData) => {
    setSelectedDevice(device);
  };

  const handleCheckboxClick = (event: React.MouseEvent<unknown>, device: DeviceData) => {
    event.stopPropagation();
    const deviceName = device.device_name;
    const selectedIndex = selectedDeviceNames.indexOf(deviceName);
    let newSelectedDeviceNames: string[] = [];

    if (selectedIndex === -1) {
      newSelectedDeviceNames = newSelectedDeviceNames.concat(selectedDeviceNames, deviceName);
    } else if (selectedIndex === 0) {
      newSelectedDeviceNames = newSelectedDeviceNames.concat(selectedDeviceNames.slice(1));
    } else if (selectedIndex === selectedDeviceNames.length - 1) {
      newSelectedDeviceNames = newSelectedDeviceNames.concat(selectedDeviceNames.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelectedDeviceNames = newSelectedDeviceNames.concat(
        selectedDeviceNames.slice(0, selectedIndex),
        selectedDeviceNames.slice(selectedIndex + 1)
      );
    }
    
    setSelectedDeviceNames(newSelectedDeviceNames);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedDeviceNames = allDevices.map((device) => device.device_name);
      setSelectedDeviceNames(newSelectedDeviceNames);
      return;
    }
    setSelectedDeviceNames([]);
  };

  const isSelected = (deviceName: string) => selectedDeviceNames.indexOf(deviceName) !== -1;

  const handleFoldersUpdate = () => {
    const fetchDevicesFunc = banbury.device.getDeviceData(selectedDevice, setSelectedDevice, setAllDevices, setIsLoading);
    fetchDevicesFunc();
  };

  const handleSyncStorageChange = async (value: string) => {
    try {
      const task_description = 'Updating Sync Storage Capacity';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const result = await handlers.devices.updateSyncStorage(value);

      if (result === 'success') {
        setUpdates(updates + 1);
        const fetchDevicesFunc = banbury.device.getDeviceData(selectedDevice, setSelectedDevice, setAllDevices, setIsLoading);
        fetchDevicesFunc();
        showAlert('Success', ['Sync storage capacity updated successfully'], 'success');
      } else {
        await banbury.sessions.failTask(taskInfo, 'Failed to update sync storage capacity', tasks, setTasks);
        showAlert('Error', ['Failed to update sync storage capacity'], 'error');
      }
    } catch (error) {
      console.error('Error updating sync storage:', error);
      showAlert('Error', ['Failed to update sync storage capacity', error instanceof Error ? error.message : 'Unknown error'], 'error');
    }
  };

  const handleSavePredictionPreferences = async (
    usePredictedCPUUsage: boolean,
    usePredictedRAMUsage: boolean,
    usePredictedGPUUsage: boolean,
    usePredictedDownloadSpeed: boolean,
    usePredictedUploadSpeed: boolean,
    useFilesNeeded: boolean,
    useFilesAvailableForDownload: boolean,
    useDeviceinFileSync: boolean,
  ) => {
    try {
      const task_description = 'Updating prediction preferences';
      const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const result = await handlers.devices.updateScorePreferences(
        usePredictedCPUUsage,
        usePredictedRAMUsage,
        usePredictedGPUUsage,
        usePredictedDownloadSpeed,
        usePredictedUploadSpeed,
        useFilesNeeded,
        useFilesAvailableForDownload,
        useDeviceinFileSync,
        banbury.device.name()
      );

      if (result === 'success') {
        showAlert('Success', ['Prediction preferences updated successfully'], 'success');
      } else {
        await banbury.sessions.failTask(taskInfo, 'Failed to update prediction preferences', tasks, setTasks);
        showAlert('Error', ['Failed to update prediction preferences'], 'error');
      }
    } catch (error) {
      console.error('Error updating prediction preferences:', error);
      showAlert('Error', ['Failed to update prediction preferences', error instanceof Error ? error.message : 'Unknown error'], 'error');
    }
  };




  const [syncStorageValue, setSyncStorageValue] = useState<string>('');
  const [usePredictedUploadSpeed, setUsePredictedUploadSpeed] = useState(true);
  const [usePredictedDownloadSpeed, setUsePredictedDownloadSpeed] = useState(true);
  const [usePredictedCPUUsage, setUsePredictedCPUUsage] = useState(true);
  const [usePredictedRAMUsage, setUsePredictedRAMUsage] = useState(true);
  const [usePredictedGPUUsage, setUsePredictedGPUUsage] = useState(true);
  const [useFilesNeeded, setUseFilesNeeded] = useState(true);
  const [useFilesAvailableForDownload, setUseFilesAvailableForDownload] = useState(true);
  const [useDeviceinFileSync, setUseDeviceinFileSync] = useState(true);

  // Update syncStorageValue when selectedDevice changes
  useEffect(() => {
    if (selectedDevice && selectedDevice.sync_storage_capacity_gb != null) {
      setSyncStorageValue(selectedDevice.sync_storage_capacity_gb.toString());
    } else {
      setSyncStorageValue('0'); // Set a default value when null
    }
  }, [selectedDevice]);

  // Initialize state values when selectedDevice changes
  useEffect(() => {
    if (selectedDevice) {
      setUsePredictedCPUUsage(selectedDevice.use_predicted_cpu_usage);
      setUsePredictedRAMUsage(selectedDevice.use_predicted_ram_usage);
      setUsePredictedGPUUsage(selectedDevice.use_predicted_gpu_usage);
      setUsePredictedDownloadSpeed(selectedDevice.use_predicted_download_speed);
      setUsePredictedUploadSpeed(selectedDevice.use_predicted_upload_speed);
      setUseFilesAvailableForDownload(selectedDevice.use_files_available_for_download);
      setUseFilesNeeded(selectedDevice.use_files_needed);
      setUseDeviceinFileSync(selectedDevice.use_device_in_file_sync);
    }
  }, [selectedDevice]);

  return (
    <Box sx={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Card variant='outlined' sx={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
        <CardContent sx={{ paddingBottom: '4px !important', paddingTop: '8px' }}>
          <Stack spacing={2} direction="row" sx={{ flexWrap: 'nowrap' }}>
            <Grid container spacing={0} sx={{ display: 'flex', flexWrap: 'nowrap', pt: 0 }}>

              <Grid item paddingRight={1}>
                <AddDeviceButton
                  selectedDevice={selectedDevice}
                  setTaskbox_expanded={setTaskbox_expanded}
                  setTasks={setTasks}
                  showAlert={showAlert}
                  tasks={tasks}
                  setIsLoading={setIsLoading}
                  setAllDevices={setAllDevices}
                  setSelectedDevice={setSelectedDevice}
                  username={username}
                  handleAddDeviceClick={handleAddDeviceClick}
                />
              </Grid>


              <Grid item paddingRight={1}>
                <DeleteDeviceButton
                  selectedDevice={selectedDevice}
                  selectedDeviceNames={selectedDeviceNames}
                  setSelectedDeviceNames={setSelectedDeviceNames}
                  setTaskbox_expanded={setTaskbox_expanded}
                  setTasks={setTasks}
                  showAlert={showAlert}
                  tasks={tasks}
                  setAllDevices={setAllDevices}
                  setIsLoading={setIsLoading}
                  setSelectedDevice={setSelectedDevice}
                />
              </Grid>
              <AddScannedFolderButton fetchDevices={banbury.device.getDeviceData(selectedDevice, setSelectedDevice, setAllDevices, setIsLoading)} />
            </Grid>
          </Stack>
        </CardContent>
      </Card>
      <Stack direction="row" spacing={0} sx={{ width: '100%', height: 'calc(100vh - 76px)', overflow: 'hidden' }}>
        <Stack
          sx={{
            position: 'relative',
            width: `${deviceListWidth}px`,
            flexShrink: 0,
            transition: isDragging ? 'none' : 'width 0.3s ease',
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <Card variant="outlined" sx={{
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            borderLeft: 0,
            borderRight: 0,
            borderRadius: 0,
          }}>
            <CardContent sx={{ height: '100%', width: '100%', overflow: 'auto' }}>
              <TableContainer sx={{ maxHeight: '96%', overflowY: 'auto', overflowX: 'auto' }}>
                <Table aria-labelledby="tableTitle" size="small">
                  <EnhancedTableHead
                    numSelected={selectedDeviceNames.length}
                    order={order}
                    orderBy={orderBy}
                    onSelectAllClick={handleSelectAllClick}
                    onRequestSort={() => { }}
                    rowCount={allDevices.length}
                  />
                  <TableBody>
                    {isLoading ? (
                      Array.from(new Array(10)).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell padding="checkbox">
                            <Skeleton variant="rectangular" width={24} height={24} />
                          </TableCell>
                          <TableCell>
                            <Skeleton variant="text" width="100%" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : allDevices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body1" color="textSecondary">
                            No devices available.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stableSort(allDevices, getComparator(order, orderBy))
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((row, index) => {
                          const labelId = `enhanced-table-checkbox-${index}`;

                          return (
                            <TableRow
                              hover
                              onClick={() => handleDeviceClick(row)}
                              role="checkbox"
                              tabIndex={-1}
                              key={row.id}
                              selected={!!selectedDevice && selectedDevice.id === row.id}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  data-testid={`device-checkbox-${row.id}`}
                                  size='small'
                                  color="primary"
                                  checked={isSelected(row.device_name)}
                                  onClick={(event) => handleCheckboxClick(event, row)}
                                  inputProps={{
                                    'aria-labelledby': labelId,
                                  }}
                                />
                              </TableCell>
                              <TableCell component="th" id={labelId} scope="row" padding="normal">
                                {row.device_name}
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
          <ResizeHandle
            className={isDragging ? 'dragging' : ''}
            onMouseDown={handleMouseDown}
          />
        </Stack>

        {/* Right panel: Device details */}
        <Card variant="outlined" sx={{
          flexGrow: 1,
          height: '100%',
          overflow: 'auto',
          borderLeft: 0,
          borderRadius: 0,
        }}>
          <CardContent>
            {isLoading ? (
              <Skeleton variant="rectangular" width="100%" height={400} />
            ) : selectedDevice ? (
              <>
                <Typography variant="h4" gutterBottom>
                  {selectedDevice.device_name}
                </Typography>

                <Tabs
                  value={selectedTab}
                  onChange={handleTabChange}
                  aria-label="device details tabs"
                  sx={{
                    minHeight: '32px',
                    '& .MuiTab-root': {
                      minHeight: '32px',
                      padding: '6px 12px',
                      fontSize: '12px'
                    }
                  }}
                >
                  <Tab label="Device Info" />
                  <Tab label="Cloud Sync" />
                  <Tab label="Performance" />
                </Tabs>

                <Divider sx={{ my: 2 }} />

                {/* Conditional rendering based on selected tab */}
                {selectedTab === 0 ? (
                  <Stack direction="column" spacing={3}>
                    {/* Details Card */}
                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>Device Info</Typography>
                      <Grid container spacing={3}>
                        {/* Left Column */}
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Device Status</Typography>
                              <Typography variant="body2">{selectedDevice.available || 'N/A'}</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Device Manufacturer</Typography>
                              <Typography variant="body2">{selectedDevice.device_manufacturer || 'N/A'}</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Device Model</Typography>
                              <Typography variant="body2">{selectedDevice.device_model || 'N/A'}</Typography>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Right Column */}
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Upload Speed</Typography>
                              <Typography variant="body2">{formatSpeed(selectedDevice.upload_speed || 0)}</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Download Speed</Typography>
                              <Typography variant="body2">{formatSpeed(selectedDevice.download_speed || 0)}</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Storage Capacity</Typography>
                              <Typography variant="body2">{formatStorageCapacity(selectedDevice.storage_capacity_gb)}</Typography>
                            </Box>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Card>

                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>Scanned Folders</Typography>
                      <Box>
                        <ScannedFoldersChips
                          scanned_folders={selectedDevice.scanned_folders}
                          username={username ?? ''}
                          onFoldersUpdate={handleFoldersUpdate}
                        />
                      </Box>
                    </Card>

                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>Downloaded Models</Typography>
                      <Box>
                        {selectedDevice.downloaded_models && selectedDevice.downloaded_models.length > 0 ? (
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 2 }}>
                            {selectedDevice.downloaded_models.map((model, index) => (
                              <Chip
                                key={index}
                                label={model}
                                color="primary"
                                variant="outlined"
                                size="small"
                                sx={{ fontSize: '12px' }}
                              />
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No models downloaded
                          </Typography>
                        )}
                      </Box>
                    </Card>
                  </Stack>
                ) : selectedTab === 1 ? (
                  <Stack direction="column" spacing={2}>
                    {/* Details Card */}
                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>Cloud Sync Details</Typography>
                      <Grid container spacing={3}>
                        {/* Left Column */}
                        <Grid item xs={12} md={4}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Predicted CPU Usage</Typography>
                              <Typography variant="body2">{selectedDevice.predicted_cpu_usage || 0}%</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Predicted RAM Usage</Typography>
                              <Typography variant="body2">{selectedDevice.predicted_ram_usage || 0}%</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Predicted GPU Usage</Typography>
                              <Typography variant="body2">{selectedDevice.predicted_gpu_usage || 0}%</Typography>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Middle Column */}
                        <Grid item xs={12} md={4}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Predicted Download Speed</Typography>
                              <Typography variant="body2">{formatSpeed(selectedDevice.predicted_download_speed || 0)}</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Predicted Upload Speed</Typography>
                              <Typography variant="body2">{formatSpeed(selectedDevice.predicted_upload_speed || 0)}</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Score</Typography>
                              <Typography variant="body2">{selectedDevice.predicted_performance_score || 0}</Typography>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Right Column */}
                        <Grid item xs={12} md={4}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Files Needed</Typography>
                              <Typography variant="body2">{selectedDevice.files_needed || 0}</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Files Available for Download</Typography>
                              <Typography variant="body2">{selectedDevice.files_available_for_download || 0}</Typography>
                            </Box>
                            <Box>
                              <Stack spacing={4}>
                                <Typography color="textSecondary" variant="caption">Sync Storage Capacity</Typography>
                              </Stack>
                              <Stack paddingTop={1} direction="row" spacing={1} alignItems="center">
                                <TextField
                                  variant="outlined"
                                  size="small"
                                  // type="number"
                                  value={syncStorageValue}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSyncStorageValue(e.target.value)}
                                  sx={{
                                    width: 60,
                                    '& .MuiOutlinedInput-root': {
                                      height: '24px',
                                      fontSize: '12px',
                                    },
                                    '& .MuiOutlinedInput-input': {
                                      padding: '2px 8px',
                                      textAlign: 'right',
                                    }
                                  }}
                                />
                                <Typography variant="caption" noWrap>GB</Typography>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleSyncStorageChange(syncStorageValue)}
                                  sx={{
                                    fontSize: '12px',
                                    padding: '2px 8px',
                                    height: '24px',
                                    minWidth: 'unset'
                                  }}
                                >
                                  Submit
                                </Button>
                              </Stack>
                            </Box>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Card>
                    {/* Include in File Sync Card */}
                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box sx={{ pr: 3 }}>
                                <Typography variant="h6" gutterBottom>Include in Cloud Sync</Typography>
                                <Typography color="textSecondary" variant="caption">Include this device in Cloud Sync. This device will take part in downloading files from your other devices.
                                  This device will also be able to upload files to your other devices. Banbury will predict device performance and allocate the highest priority files to the
                                  highest performing devices.
                                </Typography>
                              </Box>
                              <Switch
                                checked={useDeviceinFileSync}
                                onChange={(e) => setUseDeviceinFileSync(e.target.checked)}
                                size="small" sx={{
                                  mt: 1,
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                    },
                                  },
                                  '& .MuiSwitch-thumb': {
                                    backgroundColor: '#fff',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#2fca45',
                                  },
                                }} />
                            </Box>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleSavePredictionPreferences(
                              usePredictedCPUUsage,
                              usePredictedRAMUsage,
                              usePredictedGPUUsage,
                              usePredictedDownloadSpeed,
                              usePredictedUploadSpeed,
                              useFilesNeeded,
                              useFilesAvailableForDownload,
                              useDeviceinFileSync
                            )}
                            sx={{ mt: 2, fontSize: '12px', padding: '2px 8px', height: '24px', minWidth: 'unset' }}
                          >
                            Save
                          </Button>
                        </Grid>
                      </Grid>
                    </Card>
                    {/* Score Configuration Card */}
                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom>Score Configuration</Typography>
                          <Typography color="textSecondary" variant="caption">Include the following metrics in performance score calculation</Typography>

                        </Grid>
                        <Grid item xs={12}>
                          <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2">Predicted CPU Usage</Typography>
                              </Box>
                              <Switch
                                checked={usePredictedCPUUsage}
                                size="small"
                                onChange={(e) => setUsePredictedCPUUsage(e.target.checked)}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                    },
                                  },
                                  '& .MuiSwitch-thumb': {
                                    backgroundColor: '#fff',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#2fca45',
                                  },
                                }} />
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2">Predicted RAM Usage</Typography>
                              </Box>
                              <Switch
                                checked={usePredictedRAMUsage}
                                size="small"
                                onChange={(e) => setUsePredictedRAMUsage(e.target.checked)}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                    },
                                  },
                                  '& .MuiSwitch-thumb': {
                                    backgroundColor: '#fff',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#2fca45',
                                  },
                                }} />
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2">Predicted GPU Usage</Typography>
                              </Box>
                              <Switch
                                checked={usePredictedGPUUsage}
                                size="small"
                                onChange={(e) => setUsePredictedGPUUsage(e.target.checked)}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                    },
                                  },
                                  '& .MuiSwitch-thumb': {
                                    backgroundColor: '#fff',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#2fca45',
                                  },
                                }} />
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2">Predicted Download Speed</Typography>
                              </Box>
                              <Switch
                                checked={usePredictedDownloadSpeed}
                                size="small"
                                onChange={(e) => setUsePredictedDownloadSpeed(e.target.checked)}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                    },
                                  },
                                  '& .MuiSwitch-thumb': {
                                    backgroundColor: '#fff',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#4caf50',
                                  },
                                }} />
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2">Predicted Upload Speed</Typography>
                              </Box>
                              <Switch
                                checked={usePredictedUploadSpeed}
                                size="small"
                                onChange={(e) => setUsePredictedUploadSpeed(e.target.checked)}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                    },
                                  },
                                  '& .MuiSwitch-thumb': {
                                    backgroundColor: '#fff',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#4caf50',
                                  },
                                }} />
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2">Files Available for Download</Typography>
                              </Box>
                              <Switch
                                checked={useFilesAvailableForDownload}
                                size="small"
                                onChange={(e) => setUseFilesAvailableForDownload(e.target.checked)}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                    },
                                  },
                                  '& .MuiSwitch-thumb': {
                                    backgroundColor: '#fff',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#4caf50',
                                  },
                                }} />
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2">Files Needed</Typography>
                              </Box>
                              <Switch
                                checked={useFilesNeeded}
                                size="small"
                                onChange={(e) => setUseFilesNeeded(e.target.checked)}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                    },
                                  },
                                  '& .MuiSwitch-thumb': {
                                    backgroundColor: '#fff',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#4caf50',
                                  },
                                }} />
                            </Box>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleSavePredictionPreferences(
                              usePredictedCPUUsage,
                              usePredictedRAMUsage,
                              usePredictedGPUUsage,
                              usePredictedDownloadSpeed,
                              usePredictedUploadSpeed,
                              useFilesNeeded,
                              useFilesAvailableForDownload,
                              useDeviceinFileSync
                            )}
                            sx={{ mt: 2, fontSize: '12px', padding: '2px 8px', height: '24px', minWidth: 'unset' }}
                          >
                            Save
                          </Button>
                        </Grid>
                      </Grid>
                    </Card>
                    {/* Status Overview Card */}
                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Grid container spacing={4}>
                        <Grid item>
                          <Button variant="outlined" size="small" sx={{ fontSize: '12px', padding: '2px 8px', height: '24px', minWidth: 'unset' }}>
                            Get Download Queue
                          </Button>
                        </Grid>

                      </Grid>
                    </Card>
                  </Stack>
                ) : selectedTab === 2 ? (
                  // Performance tab content
                  <Stack direction="column" spacing={3}>
                    {/* Performance Card */}
                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
                      <Grid container spacing={3}>
                        {/* Left Column */}
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography color="textSecondary" variant="caption">CPU Usage</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Chip
                                  label={`${(parseFloat(selectedDevice.cpu_usage) || 0).toFixed(2)}%`}
                                  color={parseFloat(selectedDevice.cpu_usage) > 80 ? 'error' : 'success'}
                                  size="small"
                                  sx={{ mr: 1, fontSize: '12px' }}
                                />
                              </Box>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">CPU Model</Typography>
                              <Typography variant="body2">
                                {selectedDevice.cpu_info_manufacturer} {selectedDevice.cpu_info_brand}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">CPU Speed</Typography>
                              <Typography variant="body2">{selectedDevice.cpu_info_speed}</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">CPU Cores</Typography>
                              <Typography variant="body2">
                                {selectedDevice.cpu_info_cores} Cores (Physical: {selectedDevice.cpu_info_physical_cores})
                              </Typography>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Right Column */}
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography color="textSecondary" variant="caption">GPU Usage</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Chip
                                  label={`${(parseFloat(selectedDevice.gpu_usage[0]) || 0).toFixed(0)}%`}
                                  size="small"
                                  sx={{ fontSize: '12px' }}
                                  color={parseFloat(selectedDevice.gpu_usage[0]) > 80 ? 'error' : 'success'}
                                />
                              </Box>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">RAM Usage</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Chip
                                  label={`${(parseFloat(selectedDevice.ram_usage[0]) || 0).toFixed(2)}%`}
                                  size="small"
                                  sx={{ fontSize: '12px' }}
                                  color={parseFloat(selectedDevice.ram_usage[0]) > 80 ? 'error' : 'success'}
                                />
                              </Box>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Total RAM</Typography>
                              <Typography variant="body2">{formatRAM(selectedDevice.ram_total[0])}</Typography>
                            </Box>
                            <Box>
                              <Typography color="textSecondary" variant="caption">Free RAM</Typography>
                              <Typography variant="body2">{formatRAM(selectedDevice.ram_free[0])}</Typography>
                            </Box>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Card>


                    <Divider orientation="horizontal" flexItem sx={{ my: 2 }} />


                    {/* Charts section */}
                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">Performance Metrics</Typography>
                        <FormControl sx={{ minWidth: 150 }}>
                          <InputLabel id="chart-select-label">Select Metric</InputLabel>
                          <Select
                            variant="outlined"
                            size="small"
                            labelId="chart-select-label"
                            value={selectedMetric}
                            label="Select Metric"
                            sx={{ fontSize: '12px' }}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                          >
                            {metricOptions.map((option) => (
                              <MenuItem sx={{ fontSize: '12px' }} key={option.value} value={option.value}>{option.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>

                      <Box sx={{ height: 300, width: '100%' }}>
                        <LineChart
                          sx={{
                            width: '100%',
                            height: '100%'
                          }}
                          xAxis={[{
                            data: timeseriesData.map((d) => new Date(d.timestamp)),
                            scaleType: 'time',
                            valueFormatter: (date) =>
                              date instanceof Date
                                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '',
                          }]}
                          series={[{
                            data: getMetricSeries(selectedMetric),
                            valueFormatter: (value) => (value == null ? 'NaN' : `${value}%`),
                            color: selectedMetric === 'gpu' ? '#4CAF50'
                              : selectedMetric === 'ram' ? '#2196F3'
                                : '#FF5722',
                            showMark: false
                          }]}
                          margin={{ top: 10, bottom: 20, left: 40, right: 10 }}
                          loading={isTimeseriesLoading}
                        />
                      </Box>
                    </Card>

                  </Stack>

                ) : (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <DevicesIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h5" color="textSecondary">
                      No devices available
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Please add a device to get started.
                    </Typography>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <DevicesIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" color="textSecondary">
                  No devices available
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Please add a device to get started.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
