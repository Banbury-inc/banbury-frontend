import axios from 'axios';
import { CONFIG } from '../config';


export async function markNotificationAsRead(
    notification_id: string,
) {
    const url = `${CONFIG.url}/notifications/mark_notification_as_read/`;
    const response = await axios.post<{ result: string; }>(url, {
        notification_id: notification_id,
    });
    const result = response.data.result;
    console.log(result);

    if (result === 'success') {

        return result;
    }
    if (result === 'fail') {
        return 'failed';
    }
    else {
        return 'failed';
    }
}

