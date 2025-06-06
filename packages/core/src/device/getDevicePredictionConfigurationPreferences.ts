import axios from 'axios';
import { CONFIG } from "../config";
import { DevicePredictionsTable } from '../types';



export async function getDevicePredictionConfigurationPreferences(): Promise<DevicePredictionsTable[]> {
  try {
    const res = await axios.get(`${CONFIG.url}/predictions/get_device_prediction_data/`);
    const json = res.data;
    if (json.result === "success") {
      return json.data as DevicePredictionsTable[];
    } else {
      return [];
    }
  } catch (e) {
    console.error("Error fetching device prediction configuration preferences:", e);
    return [];
  }
} 
