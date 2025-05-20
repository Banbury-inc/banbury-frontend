import axios from 'axios';
import { CONFIG } from '../config';
import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';

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
    const { token } = loadGlobalAxiosAuthToken();
    const url = `${CONFIG.url}/notifications/add_notification/${friend_username}/`;
    const response = await axios.post<{ result: string }>(url, {
        friend_username,
        notification,
    }, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
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

