import axios from 'axios';
import { CONFIG } from "../config";


export async function getTimeseriesData(deviceId: string): Promise<any[]> {
  if (!deviceId) return [];
  try {
    const res = await axios.get(`${CONFIG.url}/devices/get_device_timeseries_data/${deviceId}/`);
    const json = res.data;
    if (json.result === "success") {
      return json.data;
    } else {
      return [];
    }
  } catch (e) {
    return [e];
  }
} 
