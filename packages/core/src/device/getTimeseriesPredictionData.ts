import axios from 'axios';
import { CONFIG } from "../config";

export async function getTimeseriesPredictionData(deviceId: string): Promise<any> {
  try {
    const response = await axios.get(`${CONFIG.url}/predictions/get_device_timeseries_prediction_data/${deviceId}/`);
    console.log(response);
    const json = response.data;
    if (json.result === "success" && json.data) {
      return json.data;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
} 