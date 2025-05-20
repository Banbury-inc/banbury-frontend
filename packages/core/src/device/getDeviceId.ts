import axios from "axios";
import { CONFIG } from "../config";
import banbury from '..';

// Function to get device ID with proper error handling
export async function getDeviceId(): Promise<{ result: string, message: string }> {

  const device_name = banbury.device.name();

  try {
    const response = await axios.get(`${CONFIG.url}/devices/get_single_device_info_with_device_name/${device_name}`);

    if (response.data.result === 'error') {
      return { result: 'error', message: response.data.message };
    }


    // Try to access device_info from the correct path
    const deviceInfo = response.data.device_info || (response.data.data && response.data.data.device_info);

    if (!deviceInfo || !deviceInfo._id) {
      console.error('Device info or device ID not found in response:', response.data);
      return { result: 'error', message: 'Device info or device ID not found' };
    }

    const deviceId = deviceInfo._id;

    // Ensure we return a string
    return { result: 'success', message: String(deviceId) };
  } catch (error) {
    console.error('Error getting device ID:', error);
    return { result: 'error', message: 'Failed to get device ID' };
  }
}
