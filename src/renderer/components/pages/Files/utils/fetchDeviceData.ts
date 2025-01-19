import axios from 'axios';
import fs from 'fs';
import { DatabaseData } from '../components/NewTreeView/types';
import { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { CONFIG } from '../../../../config/config';



export const fetchDeviceData = async (
  username: string,
  disableFetch: boolean,
  global_file_path: string,
  options: {
    setFirstname: (value: string) => void;
    setLastname: (value: string) => void;
    setDevices: (value: any[]) => void;
  },
) => {


  try {
    // Fetch fresh data from API
    const [deviceInfoResponse] = await Promise.all([
      axios.get<{ devices: any[]; }>(`${CONFIG.url}/devices/getdeviceinfo/${username}/`)
    ]);

    console.log(deviceInfoResponse.data.devices)


    return deviceInfoResponse.data.devices;


  } catch (error) {
    console.error('Error fetching data:', error);
  }
} 
