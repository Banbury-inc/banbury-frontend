import axios from 'axios';
import { CONFIG } from '../config';

export async function deleteNotification(
    notification_id: string,
    username: string,
) {

    const url = `${CONFIG.url}/notifications/delete_notification/${username}/`;

    const response = await axios.post<{ result: string; username: string; }>(url, {
        notification_id: notification_id,
    });
    const result = response.data.result;

    if (result === 'success') {
        return result;
    }
    if (result === 'fail') {
        return 'failed';
    }
    else {
        return 'task_add failed';
    }
}

