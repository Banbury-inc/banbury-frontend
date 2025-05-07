import axios from "axios";
import { CONFIG } from "../config";





// Function to get total requests processed
export async function getSingleDeviceInfo(device_id: string | undefined): Promise<any | null> {
  try {
    const response = await axios.get(`http://${CONFIG.url}/devices/get_single_device_info/${device_id}`);
    const deviceInfo = response.data.device_info;
    return deviceInfo;
  } catch (error) {
    return error
  }
}
