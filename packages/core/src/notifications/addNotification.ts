import axios from 'axios';
import { CONFIG } from '../config';


export async function addNotification(
    friend_username: string,
    notification: {
        type: string;
        title: string;
        description: string;
        timestamp: Date;
        read: boolean;
    },
) {
    const url = `${CONFIG.url}/notifications/add_notification/`;
    const response = await axios.post<{ result: string }>(url, {
        friend_username: friend_username,
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

