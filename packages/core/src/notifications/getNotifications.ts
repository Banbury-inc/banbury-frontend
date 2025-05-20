import axios from 'axios';
import { CONFIG } from '../config';
import '../middleware/axiosGlobalHeader';
import { loadGlobalAxiosAuthToken } from '../middleware/axiosGlobalHeader';

export async function getNotifications() {
    try {
        const url = `${CONFIG.url}/notifications/get_notifications/`;
        const { token } = loadGlobalAxiosAuthToken();

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });


        switch (response.data.result) {
            case 'success':
                return response.data.notifications;

            case 'fail':
                throw new Error('Failed to fetch notifications');

            case 'task_already_exists':
                throw new Error('Task already exists');

            default:
                throw new Error('Unknown error occurred');
        }
    } catch (error) {
        throw new Error('Failed to fetch notifications' + error);
    }
}

