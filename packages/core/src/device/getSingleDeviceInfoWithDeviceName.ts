import axios from "axios";
import { CONFIG } from "../config";
import '../middleware/axiosGlobalHeader';
import fs from 'fs';
import os from 'os';
import path from 'path';

const TOKEN_FILE = path.join(os.homedir(), '.banbury', 'token');

// Function to get total requests processed
export async function getSingleDeviceInfoWithDeviceName(device_name: string): Promise<any | null> {
  try {
    let token = '';
    if (fs.existsSync(TOKEN_FILE)) {
      token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    }
    const response = await axios.get(
      `${CONFIG.url}/devices/get_single_device_info_with_device_name/${device_name}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );
    const deviceInfo = response.data.data.device_info;
    return deviceInfo;
  } catch (error) {
    console.error('Error fetching device info:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
    }
  }
}
