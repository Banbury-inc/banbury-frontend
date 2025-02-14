import axios from "axios";
import { CONFIG } from "../config";
import { banbury } from '..'

// Function to get total requests processed
export async function getDeviceId(username: string | undefined): Promise<any | null> {


  const device_name = banbury.device.name();

  try {
    const response = await axios.get(`${CONFIG.url}/devices/get_single_device_info_with_device_name/${username}/${device_name}`);
    const deviceInfo = response.data.device_info;
    const device_id = deviceInfo._id;


    return device_id;
  } catch (error) {
    return error;
  }
}
