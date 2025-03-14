import axios from 'axios';
import banbury from '@banbury/core';



export const fetchDeviceData = async (
  username: string,
) => {


  try {
    // Fetch fresh data from API
    const [deviceInfoResponse] = await Promise.all([
      axios.get<{ devices: any[]; }>(`${banbury.config.url}/devices/getdeviceinfo/${username}/`)
    ]);


    return deviceInfoResponse.data.devices;


  } catch (error) {
    console.error('Error fetching data:', error);
  }
} 
