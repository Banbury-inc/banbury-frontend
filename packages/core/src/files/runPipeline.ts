
import axios from 'axios';
import { CONFIG } from '../config';


export async function runPipeline(
) {
  const url = `${CONFIG.url}/predictions/run_pipeline/`;

  try {
    const response = await axios.get<{ result: string; }>(url);
    const result = response.data.result;

    if (result === 'success') {
      return response.data;
    }
    if (result === 'fail') {
      return 'failed';
    }
    if (result === 'task_already_exists') {
      return 'exists';
    }
    else {
      return 'task_add failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return 'error';
  }
}
