import axios from 'axios';
import { CONFIG } from '../config';



export const fetchDeviceData = async (
  username: string,
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
