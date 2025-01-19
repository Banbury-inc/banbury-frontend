import axios from 'axios';
import { neuranet } from '..'
import * as DateUtils from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { CONFIG } from '../../config/config';


export async function markNotificationAsRead(
    notification_id: string,
) {
    let url = `${CONFIG.url}/notifications/mark_notification_as_read/`;
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

