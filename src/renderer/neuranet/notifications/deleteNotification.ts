import axios from 'axios';
import { neuranet } from '..'
import * as DateUtils from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { CONFIG } from '../../config/config';


export async function deleteNotification(
    notification_id: string,
    username: string,
) {


    let user = username;
    let device_name = neuranet.device.name();
    let url = `${CONFIG.url}/notifications/delete_notification/${username}/`;

    const response = await axios.post<{ result: string; username: string; }>(url, {
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
        return 'task_add failed';
    }
}

