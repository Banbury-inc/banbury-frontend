import React, { useEffect, useState, useRef } from 'react';
import Stack from '@mui/material/Stack';
import { exec } from "child_process";
import axios from 'axios';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import HomeIcon from '@mui/icons-material/Home';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import GrainIcon from '@mui/icons-material/Grain';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import SendIcon from '@mui/icons-material/Send';
import * as path from "path";
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import { visuallyHidden } from '@mui/utils';
import { CardContent } from "@mui/material";
import AccountMenuIcon from '../common/AccountMenuIcon';
import { useAuth } from '../../context/AuthContext';
import Card from '@mui/material/Card';
import { VariantType, useSnackbar } from 'notistack';
import TextField from '@mui/material/TextField';




import CircularProgress, {
  CircularProgressProps,
} from '@mui/material/CircularProgress';
import TaskBadge from '../TaskBadge';


// Simplified data interface to match your file structure
interface FileData {
  id: number;
  fileName: string;
  dateUploaded: string;
  fileSize: string;
  deviceID: string;
  deviceName: string;
}

// Define head cells according to FileData
const headCells = [
  { id: 'fileName', numeric: false, label: 'Name' },
  { id: 'fileSize', numeric: false, label: 'Size' },
  { id: 'location', numeric: false, label: 'Location' },
  { id: 'dateUploaded', numeric: true, label: 'Date Uploaded' },
];

type Order = 'asc' | 'desc';


interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof FileData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  order: Order;
  orderBy: keyof FileData;
  rowCount: number;
}





export default function AI() {
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [dense, setDense] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [fileRows, setFileRows] = useState<FileData[]>([]); // State for storing fetched file data
  const getSelectedFileNames = () => {
    return selected.map(id => {
      const file = fileRows.find(file => file.id === id);
      return file ? file.fileName : null;
    }).filter(fileName => fileName !== null); // Filter out any null values if a file wasn't found
  };
  const [messages, setMessages] = useState([
    { id: 0, text: 'Hello! How can I assist you today?', sender: 'bot' }
  ]);


  function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  const [Firstname, setFirstname] = useState<string>('');
  const [Lastname, setLastname] = useState<string>('');
  const { username } = useAuth();
  console.log(username)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get<{
          devices: any[]
          first_name: string;
          last_name: string;
          // }>('https://website2-v3xlkt54dq-uc.a.run.app/getuserinfo2/' + username + '/');
        }>('https://website2-v3xlkt54dq-uc.a.run.app/getuserinfo2/' + username + '/');
        // }>('https://website2-v3xlkt54dq-uc.a.run.app/getuserinfo/');

        const fetchedFirstname = response.data.first_name;
        const fetchedLastname = response.data.last_name;
        setFirstname(fetchedFirstname);
        setLastname(fetchedLastname);
        const files = response.data.devices.flatMap((device, index) =>
          device.files.map((file: any, fileIndex: number): FileData => ({
            id: index * 1000 + fileIndex, // Generating unique IDs
            // id: device.id + fileIndex,
            fileName: file["File Name"],
            // fileSize: file["File Size"],
            fileSize: formatBytes(file["File Size"]),
            dateUploaded: file["Date Uploaded"],
            deviceID: device.device_number,
            deviceName: device.device_name
          }))
        );

        setFileRows(files);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();

  },

    []);



  useEffect(() => {
    const interval = setInterval(() => {
      const fetchData = async () => {
        try {
          const response = await axios.get<{
            devices: any[]
            first_name: string;
            last_name: string;
          }>('https://website2-v3xlkt54dq-uc.a.run.app/getuserinfo2/' + username + '/');

          const fetchedFirstname = response.data.first_name;
          const fetchedLastname = response.data.last_name;
          setFirstname(fetchedFirstname);
          setLastname(fetchedLastname);
          const files = response.data.devices.flatMap((device, index) =>
            device.files.map((file: any, fileIndex: number): FileData => ({
              id: index * 1000 + fileIndex, // Generating unique IDs
              // id: device.id + fileIndex,
              fileName: file["File Name"],
              // fileSize: file["File Size"],
              fileSize: formatBytes(file["File Size"]),
              dateUploaded: file["Date Uploaded"],
              deviceID: device.device_number,
              deviceName: device.device_name
            }))
          );

          setFileRows(files);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
        finally {
          setIsLoading(false); // Set loading to false once data is fetched or in case of an error
        }
      };
      fetchData();
    }, 1000);

    return () => clearInterval(interval);
  },

    []);


  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Avoid a layout jump when reaching the last page with empty rows.
  // Calculate empty rows for pagination



  function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  }










  return (
    // <Box sx={{ width: '100%', height: '100%', flexGrow: 1 , pl: 4, pr: 4, mt: 0, pt: 5 }}>
    <Box sx={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      pl: 4,
      pr: 4,
      mt: 0,
      pt: 5,

    }}>
      <Stack spacing={2}>
        <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
          <Grid item>
            <Typography variant="h2" textAlign="left">
              Athena
            </Typography>
          </Grid>

          <Grid item>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
              <Stack direction="row" spacing={0} sx={{ width: '100%' }}>
                <TaskBadge />
                <AccountMenuIcon />
              </Stack>
            </Box>
          </Grid>
        </Grid>

        <Card variant='outlined' sx={{ flexGrow: 0 }}>
          <CardContent>
            <Box sx={{ flex: 1, overflowY: 'auto', mt: 3 }}>
              {messages.map(message => (
                <Typography key={message.id} align={message.sender === 'bot' ? 'left' : 'right'} paragraph>
                  {message.text}
                </Typography>
              ))}
            </Box>
          </CardContent>
        </Card >
        <Card variant='outlined' sx={{ flexGrow: 0 }}>
          <CardContent>
            <Button
            >
              Upload
            </Button>


          </CardContent>
        </Card >



      </Stack>

      <Stack direction="row" spacing={0} sx={{ width: '100%' }}>
      </Stack>


      <Grid container alignItems={"flex-end"} sx={{ mb: 4, pl: 20, pr: 20 }}>
        {/* <Agents />  */}
      </Grid>

      <Grid container alignItems={"flex-end"} sx={{ mb: 4, pl: 20, pr: 20 }}>
        <TextField
          fullWidth
          label="Message Athena"
          size='small'
          InputProps={{
            type: 'search',
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => console.log('Search icon clicked')}
                  edge="end"
                >
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}


        />
      </Grid>
    </Box>

  );
}
