import axios from 'axios';
import { CONFIG } from '../config';
import { getDeviceInfo } from './getDeviceInfo';

/**
 * Starts a process that collects device info every 10 minutes and sends it to the backend.
 * @param username The username of the device owner.
 * @param sendingDeviceName The name of the device sending the info.
 * @param requestingDeviceName The name of the device requesting the info (can be same as sending).
 */
export function startPeriodicDeviceInfoProcess(
  username: string,
  sendingDeviceName: string,
  requestingDeviceName: string
) {
  async function sendDeviceInfo() {
    try {
      const deviceInfo = await getDeviceInfo();

      await axios.post(`${CONFIG.url}/devices/update_device_info/`, {
        device_info: deviceInfo,
        sending_device_name: sendingDeviceName,
      });
    } catch (error) {
      // Optionally log or handle error
      console.error('Failed to send device info:', error);
    }
  }

  // Initial call
  sendDeviceInfo();

  // Repeat every 10 minutes
  setInterval(sendDeviceInfo, 10 * 60 * 1000);
}
