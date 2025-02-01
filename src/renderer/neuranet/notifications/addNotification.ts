import axios from 'axios';
import { CONFIG } from '../../config/config';


export async function addNotification(
    username: string,
    notification: {
        type: string;
        title: string;
        description: string;
        timestamp: Date;
        read: boolean;
    },
) {



    const url = `${CONFIG.url}/notifications/add_notification/${username}/`;



    const response = await axios.post<{ result: string; username: string; }>(url, {
        notification: notification,
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
}

