import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import Grid from '@mui/material/Grid';
import Checkbox from '@mui/material/Checkbox';
import { LineChart } from '@mui/x-charts/LineChart';
import { visuallyHidden } from '@mui/utils';
import { CardContent } from "@mui/material";
import ScannedFoldersChips from './components/ScannedFoldersChips';
import { styled } from '@mui/material/styles';
import AddScannedFolderButton from './components/ScannedFolderButton/AddScannedFolderButton';
import { useAuth } from '../../../renderer/context/AuthContext';
import Card from '@mui/material/Card';
import { Textbox } from '../../common/Textbox/Textbox';
import { handlers } from '../../../renderer/handlers';
import banbury from '@banbury/core';
import { formatRAM } from '../../../../../core/src/utils';
import Divider from '@mui/material/Divider';
import { Text } from '../../common/Text/Text';
import { Navbar, NavbarItem } from '../../common/NavBar/Navbar';
import { useAlert } from '../../../renderer/context/AlertContext';
import { handleAddDeviceClick } from './components/AddDeviceButton/handleAddDeviceClick';
import { DeviceData } from './types';
import AddDeviceButton from './components/AddDeviceButton/AddDeviceButton';
import DeleteDeviceButton from './components/DeleteDeviceButton/DeleteDeviceButton';
import { Button } from '../../common/Button/Button';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '../../common/Dropdown/Dropdown';

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

function getValueFormatter(metric: string) {
  return (value: number | null) => {
    if (value == null || isNaN(Number(value))) return 'N/A';
    switch (metric) {
      case 'cpu':
      case 'ram':
      case 'gpu':
      case 'battery_status':
        return `${Number(value).toFixed(2)}%`;
      case 'storage_capacity_gb':
        return `${Number(value).toFixed(2)} GB`;
      case 'battery_time_remaining': {
        // Assume value is in minutes
        const hours = Math.floor(Number(value) / 60);
        const minutes = Math.floor(Number(value) % 60);
        return `${hours}h ${minutes}m`;
      }
      case 'ram_total':
      case 'ram_free':
        return formatRAM(Number(value));
      case 'upload_speed':
      case 'download_speed':
        return formatSpeed(Number(value));
      default:
        return value.toString();
    }
  };
}


// Helper to get the value key for a metric
function getMetricValueKey(metric: string): string {
  switch (metric) {
    case 'cpu': return 'cpu_usage';
    case 'ram': return 'ram_usage';
    case 'gpu': return 'gpu_usage';
    case 'storage_capacity_gb': return 'storage_capacity_gb';
    case 'battery_status': return 'battery_status';
    case 'battery_time_remaining': return 'battery_time_remaining';
    case 'ram_total': return 'ram_total';
    case 'ram_free': return 'ram_free';
    case 'upload_speed': return 'upload_speed';
    case 'download_speed': return 'download_speed';
    default: return '';
  }
}

// Helper to map series data to a unified timeline - keeping only essential logs
function mapSeriesToTimeline(timeline: Date[], data: any[], valueKey: string) {
  // Handle empty data case properly
  if (!data || data.length === 0) return timeline.map(() => null);
  
  // FIX: Create a normalized timestamp mapping
  const timeToValue = new Map();
  
  // FIX: Extract timestamps and normalize to milliseconds, removing timezone and formatting differences
  data.forEach(d => {
    if (d && d.timestamp && d[valueKey] !== undefined) {
      try {
        // Parse timestamp to Date and get milliseconds (handles different formats)
        let dateObj = new Date(d.timestamp);
        const timeMs = dateObj.getTime();
        
        // Make sure it's a valid date
        if (!isNaN(timeMs)) {
          const value = Number(d[valueKey]);
          if (!isNaN(value)) {
            timeToValue.set(timeMs, value);
          }
        }
      } catch (e) {
        console.error("Error parsing timestamp:", d.timestamp, e);
      }
    }
  });
  
  // FIX: Map using milliseconds for comparison
  return timeline.map((date) => {
    const timeMs = date.getTime();
    
    // Find closest timestamp if exact match not found (within 1s tolerance)
    if (timeToValue.has(timeMs)) {
      return timeToValue.get(timeMs);
    } 
    
    // If no exact match, try nearby timestamps within 1 second (1000ms)
    const tolerance = 1000; // 1 second tolerance
    for (let offset = 1; offset <= tolerance; offset++) {
      if (timeToValue.has(timeMs - offset)) return timeToValue.get(timeMs - offset);
      if (timeToValue.has(timeMs + offset)) return timeToValue.get(timeMs + offset);
    }
    
    return null;
  });
}

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
        showAlert('Error', ['Failed to fetch timeseries data', e instanceof Error ? e.message : 'Unknown error'], 'error');
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

  const latestTimeseries = timeseriesData.length > 0 ? timeseriesData[timeseriesData.length - 1] : null;

  const [timeseriesPredictionData, setTimeseriesPredictionData] = useState<any>(null);
  const [isTimeseriesPredictionLoading, setIsTimeseriesPredictionLoading] = useState(false);

  // Add memoization for prediction data to prevent recalculations on every render
  const memoizedPredictionData = useMemo(() => {
    return Array.isArray(timeseriesPredictionData) ? timeseriesPredictionData : [];
  }, [timeseriesPredictionData]);

  useEffect(() => {
    const fetchPredictionData = async () => {
      if (!selectedDevice || !selectedDevice._id) {
        setTimeseriesPredictionData([]);
        return;
      }
      setIsTimeseriesPredictionLoading(true);
      try {
        const data = await banbury.device.getTimeseriesPredictionData(selectedDevice._id);
        // Ensure we always set an array
        if (Array.isArray(data)) {
          setTimeseriesPredictionData(data);
        } else if (data && Array.isArray(data.predictions)) {
          setTimeseriesPredictionData(data.predictions);
        } else if (data && typeof data === 'object') {
          setTimeseriesPredictionData([data]);
        } else {
          setTimeseriesPredictionData([]);
        }
      } catch (e) {
        showAlert('Error', ['Failed to fetch timeseries prediction data', e instanceof Error ? e.message : 'Unknown error'], 'error');
        setTimeseriesPredictionData(null);
      } finally {
        setIsTimeseriesPredictionLoading(false);
      }
    };
    fetchPredictionData();
  }, [selectedDevice]);

  const latestPrediction = Array.isArray(timeseriesPredictionData) && timeseriesPredictionData.length > 0
    ? timeseriesPredictionData[timeseriesPredictionData.length - 1]
    : null;

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
                          <Text className="text-base text-gray-500">
                            No devices available.
                          </Text>
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
                                <Text className="text-base">
                                  {row.device_name}
                                </Text>
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
                <Text className="text-2xl font-bold mb-2">
                  {selectedDevice.device_name}
                </Text>

                <Navbar className="mb-2">
                  <NavbarItem current={selectedTab === 0} onClick={() => setSelectedTab(0)}>
                    Device Info
                  </NavbarItem>
                  <NavbarItem current={selectedTab === 1} onClick={() => setSelectedTab(1)}>
                    Cloud Sync
                  </NavbarItem>
                  <NavbarItem current={selectedTab === 2} onClick={() => setSelectedTab(2)}>
                    Performance
                  </NavbarItem>
                </Navbar>

                {/* Conditional rendering based on selected tab */}
                {selectedTab === 0 ? (
                  <Stack direction="column" spacing={3}>
                    {/* Details Card */}
                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Text className="text-base font-semibold mb-1">Device Info</Text>
                      <Grid container spacing={3}>
                        {/* Left Column */}
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Text className="text-xs text-gray-500">Device Status</Text>
                              <Text className="text-sm">{selectedDevice.available || 'N/A'}</Text>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">Device Manufacturer</Text>
                              <Text className="text-sm">{selectedDevice.device_manufacturer || 'N/A'}</Text>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">Device Model</Text>
                              <Text className="text-sm">{selectedDevice.device_model || 'N/A'}</Text>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Right Column */}
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Text className="text-xs text-gray-500">Upload Speed</Text>
                              <Text className="text-sm">{formatSpeed(selectedDevice.upload_speed || 0)}</Text>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">Download Speed</Text>
                              <Text className="text-sm">{formatSpeed(selectedDevice.download_speed || 0)}</Text>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">Storage Capacity</Text>
                              <Text className="text-sm">{formatStorageCapacity(selectedDevice.storage_capacity_gb)}</Text>
                            </Box>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Card>

                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Text className="text-base font-semibold mb-1">Scanned Folders</Text>
                      <Box>
                        <ScannedFoldersChips
                          scanned_folders={selectedDevice.scanned_folders}
                          username={username ?? ''}
                          onFoldersUpdate={handleFoldersUpdate}
                        />
                      </Box>
                    </Card>

                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Text className="text-base font-semibold mb-1">Downloaded Models</Text>
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
                          <Text className="text-sm text-gray-500">
                            No models downloaded
                          </Text>
                        )}
                      </Box>
                    </Card>
                  </Stack>
                ) : selectedTab === 1 ? (
                  <Stack direction="column" spacing={2}>
                    {/* Details Card */}
                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Text className="text-base font-semibold mb-1">Cloud Sync Details</Text>
                      <Grid container spacing={3}>
                        {/* Left Column */}
                        <Grid item xs={12} md={4}>
                          <Stack spacing={2}>
                            <Box>
                              <Text className="text-xs text-gray-500">Predicted CPU Usage</Text>
                              <Text className="text-sm">
                                {isTimeseriesPredictionLoading
                                  ? 'Loading...'
                                  : (latestPrediction?.cpu_usage ?? 0).toFixed(2)}%
                              </Text>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">Predicted RAM Usage</Text>
                              <Text className="text-sm">
                                {isTimeseriesPredictionLoading
                                  ? 'Loading...'
                                  : (latestPrediction?.ram_usage ?? 0).toFixed(2)}%
                              </Text>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">Predicted GPU Usage</Text>
                              <Text className="text-sm">
                                {isTimeseriesPredictionLoading
                                  ? 'Loading...'
                                  : (latestPrediction?.gpu_usage ?? 0).toFixed(2)}%
                              </Text>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Middle Column */}
                        <Grid item xs={12} md={4}>
                          <Stack spacing={2}>
                            <Box>
                              <Text className="text-xs text-gray-500">Predicted Download Speed</Text>
                              <Text className="text-sm">
                                {isTimeseriesPredictionLoading
                                  ? 'Loading...'
                                  : formatSpeed(latestPrediction?.download_speed ?? 0)
                                }
                              </Text>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">Predicted Upload Speed</Text>
                              <Text className="text-sm">
                                {isTimeseriesPredictionLoading
                                  ? 'Loading...'
                                  : formatSpeed(latestPrediction?.upload_speed ?? 0)}
                              </Text>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Right Column */}
                        <Grid item xs={12} md={4}>
                          <Stack spacing={2}>
                            <Box>
                              <Stack spacing={4}>
                                <Text className="text-xs text-gray-500">Sync Storage Capacity</Text>
                              </Stack>
                              <Stack paddingTop={1} direction="row" spacing={1} alignItems="center">
                                <Textbox
                                  value={syncStorageValue}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSyncStorageValue(e.target.value)}
                                  className="w-16 text-right text-xs px-2 py-1 h-6"
                                />
                                <Text className="text-xs text-gray-500">GB</Text>
                                <Button
                                  onClick={() => handleSyncStorageChange(syncStorageValue)}
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
                                <Text className="text-base font-semibold mb-1">Include in Cloud Sync</Text>
                                <Text className="text-xs text-gray-500">Include this device in Cloud Sync. This device will take part in downloading files from your other devices.
                                  This device will also be able to upload files to your other devices. Banbury will predict device performance and allocate the highest priority files to the
                                  highest performing devices.
                                </Text>
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
                          <Text className="text-base font-semibold mb-1">Score Configuration</Text>
                          <Text className="text-xs text-gray-500">Include the following metrics in performance score calculation</Text>

                        </Grid>
                        <Grid item xs={12}>
                          <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Text className="text-sm">Predicted CPU Usage</Text>
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
                                <Text className="text-sm">Predicted RAM Usage</Text>
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
                                <Text className="text-sm">Predicted GPU Usage</Text>
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
                                <Text className="text-sm">Predicted Download Speed</Text>
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
                                <Text className="text-sm">Predicted Upload Speed</Text>
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
                                <Text className="text-sm">Files Available for Download</Text>
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
                                <Text className="text-sm">Files Needed</Text>
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
                          <Button>
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
                      <Text className="text-base font-semibold mb-1">Performance Metrics</Text>
                      <Grid container spacing={3}>
                        {/* Left Column */}
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Text className="text-xs text-gray-500">CPU Usage</Text>
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Chip
                                  label={latestTimeseries ? `${(parseFloat(latestTimeseries.cpu_usage) || 0).toFixed(2)}%` : 'N/A'}
                                  color={latestTimeseries && parseFloat(latestTimeseries.cpu_usage) > 80 ? 'error' : 'success'}
                                  size="small"
                                  sx={{ mr: 1, fontSize: '12px' }}
                                />
                              </Box>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">CPU Model</Text>
                              <Text className="text-sm">
                                {selectedDevice?.cpu_info_manufacturer} {selectedDevice?.cpu_info_brand}
                              </Text>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">CPU Speed</Text>
                              <Text className="text-sm">{selectedDevice?.cpu_info_speed}</Text>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">CPU Cores</Text>
                              <Text className="text-sm">
                                {selectedDevice?.cpu_info_cores} Cores (Physical: {selectedDevice?.cpu_info_physical_cores})
                              </Text>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Right Column */}
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Text className="text-xs text-gray-500">GPU Usage</Text>
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Chip
                                  label={latestTimeseries ? `${(parseFloat(latestTimeseries.gpu_usage) || 0).toFixed(0)}%` : 'N/A'}
                                  size="small"
                                  sx={{ fontSize: '12px' }}
                                  color={latestTimeseries && parseFloat(latestTimeseries.gpu_usage) > 80 ? 'error' : 'success'}
                                />
                              </Box>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">RAM Usage</Text>
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Chip
                                  label={latestTimeseries ? `${(parseFloat(latestTimeseries.ram_usage) || 0).toFixed(2)}%` : 'N/A'}
                                  size="small"
                                  sx={{ fontSize: '12px' }}
                                  color={latestTimeseries && parseFloat(latestTimeseries.ram_usage) > 80 ? 'error' : 'success'}
                                />
                              </Box>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">Total RAM</Text>
                              <Text className="text-sm">{latestTimeseries ? formatRAM(latestTimeseries.ram_total) : 'N/A'}</Text>
                            </Box>
                            <Box>
                              <Text className="text-xs text-gray-500">Free RAM</Text>
                              <Text className="text-sm">{latestTimeseries ? formatRAM(latestTimeseries.ram_free) : 'N/A'}</Text>
                            </Box>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Card>


                    <Divider orientation="horizontal" flexItem sx={{ my: 2 }} />


                    {/* Charts section */}
                    <Card variant='outlined' sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Text className="text-base font-semibold mb-1">Performance Metrics</Text>
                        <Dropdown>
                          <DropdownButton outline>
                            {metricOptions.find(option => option.value === selectedMetric)?.label || 'Select Metric'}
                          </DropdownButton>
                          <DropdownMenu>
                            {metricOptions.map(option => (
                              <DropdownItem key={option.value} onClick={() => setSelectedMetric(option.value)}>
                                {option.label}
                              </DropdownItem>
                            ))}
                          </DropdownMenu>
                        </Dropdown>
                      </Stack>

                      {/* Legend */}
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 20, height: 3, bgcolor: selectedMetric === 'gpu' ? '#4CAF50' : selectedMetric === 'ram' ? '#2196F3' : selectedMetric === 'cpu' ? '#FF5722' : '#9C27B0', mr: 1 }} />
                          <Text className="text-xs text-gray-500">Actual</Text>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 20, height: 0, borderTop: '3px dashed #673ab7', mr: 1 }} />
                          <Text className="text-xs text-gray-500">Predicted</Text>
                        </Box>
                      </Stack>

                      <Box sx={{ height: 300, width: '100%' }}>
                        {(() => {
                          // Build unified timeline
                          const actualTimestamps = timeseriesData.map((d) => new Date(d.timestamp).getTime());
                          const valueKey = getMetricValueKey(selectedMetric);
                          const actualSeries = mapSeriesToTimeline(
                            actualTimestamps.map((t) => new Date(t)),
                            timeseriesData,
                            valueKey
                          );

                          // Only show a third of the actual data length for predictions
                          const predictedDataArray = memoizedPredictionData;
                          const predictedLength = Math.ceil(actualSeries.length / 3);
                          // Find the timestamp of the last actual data point
                          const lastActualTimestamp = actualTimestamps.length > 0 ? actualTimestamps[actualTimestamps.length - 1] : null;
                          // Find the index in the prediction array where the timestamp is just after the last actual data point
                          let startPredictionIdx = 0;
                          if (lastActualTimestamp !== null) {
                            startPredictionIdx = predictedDataArray.findIndex((d) => {
                              const predTs = new Date(d.timestamp).getTime();
                              return predTs > lastActualTimestamp;
                            });
                            if (startPredictionIdx === -1) startPredictionIdx = 0;
                          }
                          const predictedDataToShow = predictedDataArray.slice(startPredictionIdx, startPredictionIdx + predictedLength);
                          
                          // 1. Extract actual values and predictions for the selected metric
                          const actualValues = timeseriesData.map(d => Number(d[valueKey]) || null);
                          const predictionValues = predictedDataToShow.map(d => {
                            // Look for the exact value key or potential alternatives
                            const exactMatch = d[valueKey];
                            const alternateMatch = 
                              d[valueKey.replace('_usage', '')] || // Try without _usage
                              d[valueKey.replace('_', '')] ||      // Try without underscores
                              d[Object.keys(d).find(k => k.toLowerCase().includes(valueKey.toLowerCase().replace('_usage', ''))) || ''];
                            
                            const value = exactMatch !== undefined ? exactMatch : 
                                         alternateMatch !== undefined ? alternateMatch : null;
                                         
                            return Number(value) || null;
                          });
                          
                          // 2. Create a unified timeline with evenly spaced points
                          const firstActualDate = actualTimestamps.length > 0 ? 
                            new Date(actualTimestamps[0]) : new Date();
                          
                          // Create sequential timestamps for chart display
                          const allDates = [];
                          const interval = 60000; // 1 minute interval
                          
                          // Add dates for actual values
                          for (let i = 0; i < actualValues.length; i++) {
                            allDates.push(new Date(firstActualDate.getTime() + i * interval));
                          }
                          
                          // Add dates for prediction values (continuing from where actual values end)
                          for (let i = 0; i < predictionValues.length; i++) {
                            allDates.push(new Date(firstActualDate.getTime() + (actualValues.length + i) * interval));
                          }
                          
                          // 3. Create series that align with our unified timeline
                          const seriesActual = [];
                          const seriesPredicted = [];
                          
                          // Fill actual values (null for prediction area)
                          for (let i = 0; i < allDates.length; i++) {
                            if (i < actualValues.length) {
                              seriesActual.push(actualValues[i]);
                            } else {
                              seriesActual.push(null);
                            }
                          }
                          
                          // Fill prediction values (null for actual area)
                          for (let i = 0; i < allDates.length; i++) {
                            if (i >= actualValues.length && i < actualValues.length + predictionValues.length) {
                              seriesPredicted.push(predictionValues[i - actualValues.length]);
                            } else {
                              seriesPredicted.push(null);
                            }
                          }
                          

                          // Debugging to verify we're accessing the correct values from the database

                          return (
                            <LineChart
                              sx={{
                                width: '100%',
                                height: '100%',
                              }}
                              xAxis={[{
                                data: allDates,
                                scaleType: 'time',
                                valueFormatter: (date) =>
                                  date instanceof Date
                                    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : '',
                              }]}
                              yAxis={[{
                                valueFormatter: getValueFormatter(selectedMetric),
                              }]}
                              series={[
                                {
                                  data: seriesActual,
                                  valueFormatter: getValueFormatter(selectedMetric),
                                  color: selectedMetric === 'gpu' ? '#4CAF50'
                                    : selectedMetric === 'ram' ? '#2196F3'
                                      : selectedMetric === 'cpu' ? '#FF5722'
                                      : '#9C27B0',
                                  showMark: false,
                                  label: 'Actual',
                                },
                                {
                                  data: seriesPredicted,
                                  valueFormatter: getValueFormatter(selectedMetric),
                                  color: '#673ab7', // purple for prediction
                                  showMark: false,
                                  label: 'Predicted',
                                }
                              ]}
                              margin={{ top: 10, bottom: 20, left: 70, right: 10 }}
                              loading={isTimeseriesLoading}
                            />
                          );
                        })()}
                      </Box>
                    </Card>

                  </Stack>

                ) : (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <DevicesIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Text className="text-2xl text-gray-500">
                      No devices available
                    </Text>
                    <Text className="text-base text-gray-500">
                      Please add a device to get started.
                    </Text>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <DevicesIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Text className="text-2xl text-gray-500">
                  No devices available
                </Text>
                <Text className="text-base text-gray-500">
                  Please add a device to get started.
                </Text>
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
