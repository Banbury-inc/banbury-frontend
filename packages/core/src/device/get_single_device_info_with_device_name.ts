import axios from "axios";
import { CONFIG } from "../config";





// Function to get total requests processed
export async function getSingleDeviceInfoWithDeviceName(username: string | undefined, device_name: string | undefined): Promise<any | null> {
  try {
    const response = await axios.get(`http://${CONFIG.url}/devices/get_single_device_info_with_device_name/${username}/${device_name}`);

    const deviceInfo = response.data.device_info;
    return deviceInfo;
  } catch (error) {
    console.error('Error fetching device info:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
    }
  }
}
