
import axios from 'axios';
import { CONFIG } from '../config';


export async function updateFilePriority(
    file_id: string,
    priority: number,
) {
    let url = ''

    try {

        url = `${CONFIG.url}/predictions/update_file_priority/`;
        const response = await axios.post<{ result: string; }>(url, {
            file_id: file_id,
            priority: priority,
        });
        const result = response.data.result;

        if (result === 'success') {


            return result;
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
        return error; // Ensure an error is returned if the request fails
    }
}

