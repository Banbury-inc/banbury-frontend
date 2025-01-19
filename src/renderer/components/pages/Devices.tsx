import React, { useEffect, useState, useRef } from 'react';
import os from 'os';
import Stack from '@mui/material/Stack';
import { join } from 'path';
import { shell } from 'electron';
import axios from 'axios';
import { FormControlLabel, FormGroup, Switch, useMediaQuery } from '@mui/material';
import ButtonBase from '@mui/material/ButtonBase';
import Box from '@mui/material/Box';
import { readdir, stat } from 'fs/promises';
import Table from '@mui/material/Table';
import Chip from '@mui/material/Chip';
import TableBody from '@mui/material/TableBody';
import DevicesIcon from '@mui/icons-material/Devices';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import TableCell from '@mui/material/TableCell';
import CloudIcon from '@mui/icons-material/Cloud';
import TableContainer from '@mui/material/TableContainer';
import { Skeleton } from '@mui/material';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import GrainIcon from '@mui/icons-material/Grain';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import { LineChart } from '@mui/x-charts/LineChart';
import StarIcon from '@mui/icons-material/Star';
import { visuallyHidden } from '@mui/utils';
import { CardContent, Container, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import AccountMenuIcon from '../common/AccountMenuIcon';
import ScannedFoldersChips from '../common/ScannedFoldersChips';
import AddToQueueIcon from '@mui/icons-material/AddToQueue';
import { styled } from '@mui/material/styles';
import NewScannedFolderButton from '../new_scanned_folder_button';
import { useAuth } from '../../context/AuthContext';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import { handlers } from '../../handlers';
import path from 'path';
import fs from 'fs';
import { neuranet } from '../../neuranet';
import { formatRAM } from '../../utils';
import { fileWatcherEmitter } from '../../neuranet/device/watchdog';
import TaskBoxButton from '../common/notifications/NotificationsButton';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import SettingsIcon from '@mui/icons-material/Settings';
import StorageIcon from '@mui/icons-material/Storage';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import LaunchIcon from '@mui/icons-material/Launch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PendingIcon from '@mui/icons-material/Pending';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { CONFIG } from '../../config/config';
import NotificationsButton from '../common/notifications/NotificationsButton';
import { useAlert } from '../../context/AlertContext';


// Update the interface to match device data
interface DeviceData {
  id: number;
  device_name: string;
  device_manufacturer: string;
  device_model: string;
  storage_capacity_gb: string;
  total_storage: string;
  upload_speed: number | string;  // Changed to allow both number and string
  download_speed: number | string;  // Changed to allow both number and string
  battery_status: string;
  battery_time_remaining: string;
  available: string;
  cpu_info_manufacturer: string;
  cpu_info_brand: string;
  cpu_info_speed: string;
  cpu_info_cores: string;
  cpu_info_physical_cores: string;
  cpu_info_processors: string;
  cpu_info_socket: string;
  cpu_info_vendor: string;
  cpu_info_family: string;
  cpu_usage: string;
  gpu_usage: string[];  // Change from string to string[]
  ram_usage: string;
  ram_total: string;
  ram_free: string;
  scanned_folders: string[];
  predicted_cpu_usage: number;
  predicted_ram_usage: number;
  predicted_gpu_usage: number;
  predicted_download_speed: number;
  predicted_upload_speed: number;
  files_available_for_download: number;
  files_needed: number;
  sync_storage_capacity_gb: number;
  predicted_performance_score: number;
  use_device_in_file_sync: boolean;
  use_predicted_cpu_usage: boolean;
  use_predicted_download_speed: boolean;
  use_predicted_gpu_usage: boolean;
  use_predicted_ram_usage: boolean;
  use_predicted_upload_speed: boolean;
  use_files_available_for_download: boolean;
  use_files_needed: boolean;
}

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

  const { files, set_Files, global_file_path, global_file_path_device, websocket } = useAuth();  // Assuming global_file_path is available via context
  const pathSegments = global_file_path ? global_file_path.split('/').filter(Boolean) : []; // Split and remove empty segments safely


  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
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


const file_name: string = 'mmills_database_snapshot.json';
const directory_name: string = 'BCloud';
const directory_path: string = path.join(os.homedir(), directory_name);
const snapshot_json: string = path.join(directory_path, file_name);

// Add this utility function at the top of the file, outside of any component
function formatSpeed(speed: number | string): string {
  if (typeof speed === 'number') {
    const speedInMbps = speed / 1000000; // Convert bits to megabits
    return `${speedInMbps.toFixed(2)} Mbps`;
  }
  return speed as string; // If it's not a number, return as is (e.g., 'N/A')
}

// Add this utility function at the top of the file, outside of any component
function formatBatteryStatus(status: string): string {
  return status === 'N/A' ? status : `${status}%`;
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
function formatTotalRAM(capacity: string | number): string {
  // Convert capacity to number if it's a string
  let capacityInBytes = typeof capacity === 'string' ? parseFloat(capacity) : capacity;

  // If conversion failed or capacity is not a valid number, return as is
  if (isNaN(capacityInBytes)) {
    return capacity as string; // Return original string for invalid input, e.g., 'N/A'
  }

  // Check size and convert to MB or GB as needed
  if (capacityInBytes >= 1e9) { // Greater than or equal to 1 GB
    return `${(capacityInBytes / 1e9).toFixed(2)} GB`;
  } else if (capacityInBytes >= 1e6) { // Greater than or equal to 1 MB
    return `${(capacityInBytes / 1e6).toFixed(2)} MB`;
  } else {
    return `${capacityInBytes} bytes`; // For smaller values, return in bytes
  }
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
  const isSmallScreen = useMediaQuery('(max-width:960px)');
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof DeviceData>('device_name');
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [selectedDeviceNames, setSelectedDeviceNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
  const [selectedFileInfo, setSelectedFileInfo] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [dense, setDense] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [deviceRows, setDeviceRows] = useState<DeviceData[]>([]); // State for storing fetched file data
  const [allDevices, setAllDevices] = useState<DeviceData[]>([]);
  const { global_file_path, global_file_path_device, setGlobal_file_path, websocket } = useAuth();
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [disableFetch, setDisableFetch] = useState(false);
  const { updates, setUpdates, tasks, setTasks, username, first_name, last_name, setFirstname, setLastname, redirect_to_login, setredirect_to_login, taskbox_expanded, setTaskbox_expanded } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'gpu' | 'ram' | 'cpu'>('cpu');
  const { showAlert } = useAlert();

  // Add this new state for managing tabs
  const [selectedTab, setSelectedTab] = useState(0);

  // Add this function to handle tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
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

  const getSelectedDeviceNames = () => {
    return selected.map(id => {
      const device = deviceRows.find(device => device.id === id);
      return device ? device.device_name : null;
    }).filter(device_name => device_name !== null); // Filter out any null values if a file wasn't found
  };


  const fetchDevices = async () => {
    try {
      const previousSelectedDeviceName = selectedDevice?.device_name; // Store the previously selected device name
      setIsLoading(true);
      // Fetch user information
      const userInfoResponse = await axios.get<{
        first_name: string;
        last_name: string;
        phone_number: string;
        email: string;
      }>(`${CONFIG.url}/users/getuserinfo/${username}/`);

      const { first_name, last_name } = userInfoResponse.data;
      setFirstname(first_name);
      setLastname(last_name);

      // Fetch device information
      const deviceInfoResponse = await axios.get<{
        devices: any[];
      }>(`${CONFIG.url}/devices/getdeviceinfo/${username}/`);

      const devicePredictionsResponse = await axios.get<{
        data: {
          device_predictions: Array<{
            device_id: string;
            device_name: string;
            files_available_for_download: number;
            files_needed: number;
            predicted_cpu_usage: number;
            predicted_download_speed: number;
            predicted_gpu_usage: number;
            predicted_ram_usage: number;
            predicted_upload_speed: number;
            use_predicted_cpu_usage: boolean;
            use_predicted_download_speed: boolean;
            use_predicted_gpu_usage: boolean;
            use_predicted_ram_usage: boolean;
            use_predicted_upload_speed: boolean;
            use_files_available_for_download: boolean;
            use_files_needed: boolean;
            use_device_in_file_sync: boolean;
            score: number;
            score_timestamp: string;
            sync_storage_capacity_gb: number;
            timestamp: string;
          }>;
          result: string;
        };
      }>(`${CONFIG.url}/predictions/get_device_prediction_data/${username}/`);

      console.log('devicePredictionsResponse: ', devicePredictionsResponse);

      const { devices } = deviceInfoResponse.data;
      const { device_predictions } = devicePredictionsResponse.data.data;

      // Transform device data
      const transformedDevices: DeviceData[] = devices.map((device, index) => {

        // Find matching predictions for this device with default values
        const devicePrediction = device_predictions?.find(
          pred => pred.device_name === device.device_name
        ) || {
          predicted_cpu_usage: 0,
          predicted_ram_usage: 0,
          predicted_gpu_usage: 0,
          predicted_download_speed: 0,
          predicted_upload_speed: 0,
          use_predicted_cpu_usage: false,
          use_predicted_download_speed: false,
          use_predicted_gpu_usage: false,
          use_predicted_ram_usage: false,
          use_predicted_upload_speed: false,
          use_files_available_for_download: false,
          use_files_needed: false,
          use_device_in_file_sync: false,
          sync_storage_capacity_gb: 0,
          files_available_for_download: 0,
          files_needed: 0,
          score: 0
        };

        console.log('devicePrediction: ', devicePrediction);

        return {
          id: index + 1,
          device_name: device.device_name,
          device_manufacturer: device.device_manufacturer,
          device_model: device.device_model,
          storage_capacity_gb: device.storage_capacity_gb,
          total_storage: device.total_storage,
          upload_speed: Array.isArray(device.upload_speed)
            ? device.upload_speed[0] || 'N/A'
            : device.upload_speed || 'N/A',
          download_speed: Array.isArray(device.download_speed)
            ? device.download_speed[0] || 'N/A'
            : device.download_speed || 'N/A',
          battery_status: Array.isArray(device.battery_status)
            ? device.battery_status[0] || 'N/A'
            : device.battery_status || 'N/A',
          battery_time_remaining: device.battery_time_remaining,
          available: device.online ? "Available" : "Unavailable",
          cpu_info_manufacturer: device.cpu_info_manufacturer,
          cpu_info_brand: device.cpu_info_brand,
          cpu_info_speed: device.cpu_info_speed,
          cpu_info_cores: device.cpu_info_cores,
          cpu_info_physical_cores: device.cpu_info_physical_cores,
          cpu_info_processors: device.cpu_info_processors,
          cpu_info_socket: device.cpu_info_socket,
          cpu_info_vendor: device.cpu_info_vendor,
          cpu_info_family: device.cpu_info_family,
          cpu_usage: device.cpu_usage,
          gpu_usage: Array.isArray(device.gpu_usage)
            ? device.gpu_usage
            : [device.gpu_usage],
          ram_usage: device.ram_usage,
          ram_total: device.ram_total,
          ram_free: device.ram_free,
          scanned_folders: Array.isArray(device.scanned_folders) ? device.scanned_folders : [],
          sync_storage_capacity_gb: devicePrediction.sync_storage_capacity_gb,
          predicted_cpu_usage: devicePrediction.predicted_cpu_usage,
          predicted_ram_usage: devicePrediction.predicted_ram_usage,
          predicted_gpu_usage: devicePrediction.predicted_gpu_usage,
          predicted_download_speed: devicePrediction.predicted_download_speed,
          predicted_upload_speed: devicePrediction.predicted_upload_speed,
          predicted_performance_score: devicePrediction.score,
          files_available_for_download: devicePrediction.files_available_for_download,
          files_needed: devicePrediction.files_needed,
          use_predicted_cpu_usage: devicePrediction.use_predicted_cpu_usage,
          use_predicted_download_speed: devicePrediction.use_predicted_download_speed,
          use_predicted_gpu_usage: devicePrediction.use_predicted_gpu_usage,
          use_predicted_ram_usage: devicePrediction.use_predicted_ram_usage,
          use_predicted_upload_speed: devicePrediction.use_predicted_upload_speed,
          use_files_available_for_download: devicePrediction.use_files_available_for_download,
          use_files_needed: devicePrediction.use_files_needed,
          use_device_in_file_sync: devicePrediction.use_device_in_file_sync,
        };
      });

      setAllDevices(transformedDevices);


      // Restore the previously selected device if it exists in the new list
      const restoredDevice = transformedDevices.find(device => device.device_name === previousSelectedDeviceName);
      if (restoredDevice) {
        setSelectedDevice(restoredDevice);
      } else if (transformedDevices.length > 0) {
        setSelectedDevice(transformedDevices[0]); // Fallback to the first device if the previous one is not found
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [username, updates]);





  useEffect(() => {
    const pathToShow = global_file_path || '/';
    const pathSegments = pathToShow.split('/').filter(Boolean).length;

    const filteredDevices = allDevices.filter(device => {
      if (!global_file_path && !global_file_path_device) {
        return true; // Show all files
      }

      if (!global_file_path && global_file_path_device) {
        return device.device_name === global_file_path_device; // Show all files for the specified device
      }

      // Add a check to ensure filePath is defined
      if (!device.device_name) {
        return false; // Skip files with undefined filePath
      }

      const deviceSegments = device.device_name.split('/').filter(Boolean).length;
      const isInSameDirectory = device.device_name.startsWith(pathToShow) && deviceSegments === pathSegments + 1;
      const isFile = device.device_name === pathToShow;

      return isInSameDirectory || isFile;
    });

    setDeviceRows(filteredDevices);

  }, [global_file_path, global_file_path_device, allDevices]);



  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: keyof DeviceData,
  ) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = deviceRows.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handle_add_scanned_folder = async (scanned_folder: string, username: string) => {
    try {
      const result = await neuranet.device.add_scanned_folder(scanned_folder, username);
      console.log(result);
      if (result === 'success') {
        await fetchDevices(); // Ensure fetchDevices is awaited to complete before proceeding
      }
    } catch (error) {
      console.error('Error adding scanned folder:', error);
    }
  }

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
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    const device_name = deviceRows.find(device => device.id === id)?.device_name;
    const newSelectedDeviceNames = newSelected
      .map(id => deviceRows.find(device => device.id === id)?.device_name)
      .filter(name => name !== undefined) as string[];
    console.log(newSelectedDeviceNames[0]);
    const directoryName = "BCloud";
    const directoryPath = join(os.homedir(), directoryName);
    let fileFound = false;
    let folderFound = false;
    let filePath = '';
    try {
      const deviceStat = await stat(newSelectedDeviceNames[0]);
      if (deviceStat.isFile()) {
        fileFound = true;
        console.log(`File '${file_name}' found in directory.`);
      }
      if (deviceStat.isDirectory()) {
        folderFound = true;
        setGlobal_file_path(newSelectedDeviceNames[0]);
      }
      if (fileFound) {
        // Send an IPC message to the main process to handle opening the file
        console.log(`Opening file '${file_name}'...`);
        shell.openPath(newSelectedDeviceNames[0]);
      }
      if (folderFound) {
        // Send an IPC message to the main process to handle opening the file
        console.log(`Opening folder '${file_name}'...`);
        // shell.openPath(newSelectedDeviceNames[0]);
      }
      if (!fileFound && !folderFound) {

        console.error(`File '${file_name}' not found in directory, searhing other devices`);

        let task_description = 'Opening ' + selectedDeviceNames.join(', ');
        let taskInfo = await neuranet.sessions.addTask(username ?? '', task_description, tasks, setTasks);
        setTaskbox_expanded(true);
        let response = await handlers.files.downloadFile(
          username ?? '',
          selectedDeviceNames,
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
  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);

    const device_name = deviceRows.find(device => device.id === id)?.device_name;
    const newSelectedDeviceNames = newSelected.map(id => deviceRows.find(device => device.id === id)?.device_name).filter(name => name !== undefined) as string[];
    setSelectedDeviceNames(newSelectedDeviceNames);
    console.log(newSelectedDeviceNames)
    console.log(selectedDeviceNames)

  };


  const [selectedDevices, setSelectedDevices] = useState<readonly number[]>([]);



  const handleAddDeviceClick = async () => {
    try {
      console.log("handling add device click");
      let device_name = neuranet.device.name();
      let task_description = 'Adding device ' + device_name;
      let taskInfo = await neuranet.sessions.addTask(username ?? '', task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const result = await handlers.devices.addDevice(username ?? '');
      
      if (result === 'success') {
        // Add default directory and refresh device list
        try {
          const defaultDirectory = path.join(os.homedir(), 'BCloud');
          await neuranet.device.add_scanned_folder(defaultDirectory, username ?? '');
          await fetchDevices();
          await neuranet.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
          showAlert('Success', ['Device added successfully'], 'success');
        } catch (folderError) {
          console.error('Error setting up default directory:', folderError);
          await neuranet.sessions.failTask(
            username ?? '', 
            taskInfo, 
            'Failed to set up default directory', 
            tasks, 
            setTasks
          );
          showAlert('Error', ['Failed to set up default directory', folderError instanceof Error ? folderError.message : 'Unknown error'], 'error');
        }
      } else {
        await neuranet.sessions.failTask(
          username ?? '', 
          taskInfo, 
          'Failed to add device', 
          tasks, 
          setTasks
        );
        showAlert('Error', ['Failed to add device'], 'error');
      }
    } catch (error) {
      console.error('Error adding device:', error);
      try {
        const errorTaskInfo = await neuranet.sessions.addTask(
          username ?? '', 
          'Error adding device', 
          tasks, 
          setTasks
        );
        await neuranet.sessions.failTask(
          username ?? '', 
          errorTaskInfo, 
          error instanceof Error ? error.message : 'Unknown error occurred', 
          tasks, 
          setTasks
        );
        showAlert('Error', ['Failed to add device', error instanceof Error ? error.message : 'Unknown error'], 'error');
      } catch (taskError) {
        console.error('Failed to create error task:', taskError);
        showAlert('Error', ['Failed to create error task', taskError instanceof Error ? taskError.message : 'Unknown error'], 'error');
      }
    }
  };

  const handleDeleteDevice = async () => {
    if (!selectedDeviceNames.length) {
      showAlert('Warning', ['Please select one or more devices to delete'], 'warning');
      return;
    }

    try {
      let task_description = 'Deleting device ' + selectedDeviceNames.join(', ');
      let taskInfo = await neuranet.sessions.addTask(username ?? '', task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const result = await neuranet.device.delete_device(username ?? '');
      
      if (result === 'success') {
        await fetchDevices();
        await neuranet.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
        setSelectedDevices([]);
        showAlert('Success', ['Device(s) deleted successfully'], 'success');
      } else {
        await neuranet.sessions.failTask(
          username ?? '', 
          taskInfo, 
          'Failed to delete device', 
          tasks, 
          setTasks
        );
        showAlert('Error', ['Failed to delete device(s)'], 'error');
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      try {
        const errorTaskInfo = await neuranet.sessions.addTask(
          username ?? '', 
          'Error deleting device', 
          tasks, 
          setTasks
        );
        await neuranet.sessions.failTask(
          username ?? '', 
          errorTaskInfo, 
          error instanceof Error ? error.message : 'Unknown error occurred', 
          tasks, 
          setTasks
        );
        showAlert('Error', ['Failed to delete device(s)', error instanceof Error ? error.message : 'Unknown error'], 'error');
      } catch (taskError) {
        console.error('Failed to create error task:', taskError);
        showAlert('Error', ['Failed to create error task', taskError instanceof Error ? taskError.message : 'Unknown error'], 'error');
      }
    }
  };


  const [deleteloading, setdeleteLoading] = useState<boolean>(false);

  const [backHistory, setBackHistory] = useState<any[]>([]);
  const [forwardHistory, setForwardHistory] = useState<any[]>([]);

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handlers.keybinds.foldernameSave(
        newFolderName,
        setIsAddingFolder,
        setUpdates,
        updates,
        global_file_path ?? '',
        setDeviceRows,
        setNewFolderName,
        setDisableFetch,
        username
      );
    }
  }
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  // Avoid a layout jump when reaching the last page with empty rows.
  // Calculate empty rows for pagination
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - deviceRows.length) : 0;

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

  const handleFoldersUpdate = () => {
    fetchDevices(); // Refetch devices when folders are updated
  };

  const handleSyncStorageChange = async (value: string) => {
    try {
      console.log(value);
      let task_description = 'Updating Sync Storage Capacity';
      let taskInfo = await neuranet.sessions.addTask(username ?? '', task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      let result = await neuranet.device.update_sync_storage_capacity(username ?? '', value);

      if (result === 'success') {
        let task_result = await neuranet.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
        setUpdates(updates + 1);
        fetchDevices();
        showAlert('Success', ['Sync storage capacity updated successfully'], 'success');
      } else {
        await neuranet.sessions.failTask(username ?? '', taskInfo, 'Failed to update sync storage capacity', tasks, setTasks);
        showAlert('Error', ['Failed to update sync storage capacity'], 'error');
      }
    } catch (error) {
      console.error('Error updating sync storage:', error);
      showAlert('Error', ['Failed to update sync storage capacity', error instanceof Error ? error.message : 'Unknown error'], 'error');
    }
  };



  const handleGetDownloadQueue = async (value: string) => {
    console.log(value);

    let task_name = 'Getting Download Queue';
    let taskInfo = await neuranet.sessions.addTask(username ?? '', task_name, tasks, setTasks);
    setTaskbox_expanded(true);

    // let response = await neuranet.files.getDownloadQueue(username ?? '');
    let response = await neuranet.files.runPipeline(username ?? '');

    console.log('response: ', response);

    let result = (response as any).result;
    let download_queue = (response as any).download_queue;


    if (result === 'success') {
      let task_result = await neuranet.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
      setUpdates(updates + 1);
      fetchDevices();
      let downloadResult = await neuranet.files.downloadFileSyncFiles(
        username ?? '',
        download_queue ?? { files: [], files_available_for_download: 0 },
        allDevices,
        taskInfo,
        tasks ?? [],
        setTasks,
        setTaskbox_expanded,
        websocket as unknown as WebSocket,
      );
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
    useDeviceinFileSync: boolean
  ) => {
    try {
      let task_description = 'Updating prediction preferences';
      let taskInfo = await neuranet.sessions.addTask(username ?? '', task_description, tasks, setTasks);
      setTaskbox_expanded(true);

      const result = await neuranet.device.updateScoreConfigurationPreferences(
        username ?? '',
        usePredictedCPUUsage,
        usePredictedRAMUsage,
        usePredictedGPUUsage,
        usePredictedDownloadSpeed,
        usePredictedUploadSpeed,
        useFilesNeeded,
        useFilesAvailableForDownload,
        useDeviceinFileSync,
        neuranet.device.name()
      );

      if (result === 'success') {
        let task_result = await neuranet.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
        showAlert('Success', ['Prediction preferences updated successfully'], 'success');
      } else {
        await neuranet.sessions.failTask(username ?? '', taskInfo, 'Failed to update prediction preferences', tasks, setTasks);
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
    <Box sx={{ width: '100%', pt: 0 }}>
      <Card variant='outlined' sx={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
        <CardContent sx={{ paddingBottom: '2px !important', paddingTop: '46px' }}>
          <Stack spacing={2} direction="row" sx={{ flexWrap: 'nowrap' }}>
            <Grid container spacing={0} sx={{ display: 'flex', flexWrap: 'nowrap', pt: 0 }}>

              <Grid item paddingRight={1}>
                <Tooltip title="Add Device">
                  <Button
                    onClick={handleAddDeviceClick}
                    sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
                  >
                    <AddToQueueIcon fontSize="inherit" />
                  </Button>
                </Tooltip>
              </Grid>


              <Grid item paddingRight={1}>
                <Tooltip title="Delete Device">
                  <Button
                    onClick={handleDeleteDevice}
                    sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
                  >
                    <DeleteIcon fontSize="inherit" />
                  </Button>
                </Tooltip>
              </Grid>
              <NewScannedFolderButton fetchDevices={fetchDevices} />
            </Grid>
            <Grid container justifyContent='flex-end' alignItems='flex-end'>
              <Grid item>
              </Grid>
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
        {/* Left panel: Device table */}
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
                    numSelected={selected.length}
                    order={order}
                    orderBy={orderBy}
                    onSelectAllClick={() => { }}
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
                          const isItemSelected = isSelected(row.id);
                          const labelId = `enhanced-table-checkbox-${index}`;

                          return (
                            <TableRow
                              hover
                              onClick={() => handleDeviceClick(row)}
                              role="checkbox"
                              aria-checked={isItemSelected}
                              tabIndex={-1}
                              key={row.id}
                              selected={!!selectedDevice && selectedDevice.id === row.id}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  color="primary"
                                  checked={isItemSelected}
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
                            onChange={(e) => setSelectedMetric(e.target.value as 'gpu' | 'ram' | 'cpu')}
                          >
                            <MenuItem sx={{ fontSize: '12px' }} value="gpu">GPU Usage</MenuItem>
                            <MenuItem sx={{ fontSize: '12px' }} value="ram">RAM Usage</MenuItem>
                            <MenuItem sx={{ fontSize: '12px' }} value="cpu">CPU Usage</MenuItem>
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
                            data: Array.from(
                              {
                                length: selectedDevice[selectedMetric === 'gpu' ? 'gpu_usage' :
                                  selectedMetric === 'ram' ? 'ram_usage' : 'cpu_usage'].length
                              },
                              (_, i) => i + 1
                            )
                          }]}
                          series={[{
                            data: Array.isArray(selectedDevice[selectedMetric === 'gpu' ? 'gpu_usage' :
                              selectedMetric === 'ram' ? 'ram_usage' : 'cpu_usage'])
                              ? (selectedDevice[selectedMetric === 'gpu' ? 'gpu_usage' :
                                selectedMetric === 'ram' ? 'ram_usage' : 'cpu_usage'] as string[]).map(Number)
                              : [Number(selectedDevice[selectedMetric === 'gpu' ? 'gpu_usage' :
                                selectedMetric === 'ram' ? 'ram_usage' : 'cpu_usage'] as string)],
                            valueFormatter: (value) => (value == null ? 'NaN' : `${value}%`),
                            color: selectedMetric === 'gpu' ? '#4CAF50'
                              : selectedMetric === 'ram' ? '#2196F3'
                                : '#FF5722',
                            showMark: false
                          }]}
                          margin={{ top: 10, bottom: 20, left: 40, right: 10 }}
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
