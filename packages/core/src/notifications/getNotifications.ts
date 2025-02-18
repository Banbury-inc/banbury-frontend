import axios from 'axios';
import { CONFIG } from '../config';

export async function getNotifications(username: string) {
    try {
        const url = `${CONFIG.url}/notifications/get_notifications/${username}/`;

        const response = await axios.get(url);

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
        throw new Error('Failed to fetch notifications');
    }
}

