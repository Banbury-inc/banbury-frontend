import axios from 'axios';
import { CONFIG } from '../config';



export const fetchDeviceData = async (
) => {
  try {
    // Fetch fresh data from API
    const [deviceInfoResponse] = await Promise.all([
      axios.get<{ devices: any[]; }>(`${CONFIG.url}/devices/getdeviceinfo/`)
    ]);

    return deviceInfoResponse.data.devices;

  } catch (error) {
    return error;
  }
} 
