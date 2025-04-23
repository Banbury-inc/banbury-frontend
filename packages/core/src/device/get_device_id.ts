import axios from "axios";
import { CONFIG } from "../config";
import banbury from '..';

// Function to get device ID with proper error handling
export async function get_device_id(username: string | undefined): Promise<{ result: string, message: string }> {
  if (!username) {
    throw new Error('Username is required');
  }

  const device_name = banbury.device.name();

  try {
    const response = await axios.get(`${CONFIG.url}/devices/get_single_device_info_with_device_name/${username}/${device_name}`);

    if (response.data.result === 'error') {
      return { result: 'error', message: response.data.message };
    }

    const deviceInfo = response.data.device_info;

    // Ensure we return a string
    return { result: 'success', message: String(deviceInfo._id) };
  } catch (error) {
    console.error('Error getting device ID:', error);
    return { result: 'error', message: 'Failed to get device ID' };
  }
}
