import axios from 'axios';
import { CONFIG } from '../config';
import { NotificationsTable } from '../types';

// Type for delete notification request payload
export interface DeleteNotificationRequest {
    notification_id: string;
}

// Type for delete notification response
export interface DeleteNotificationResponse {
    result: 'success' | 'fail';
    notification?: NotificationsTable;
}

export async function deleteNotification(
    notification_id: string,
) {

    const url = `${CONFIG.url}/notifications/delete_notification/`;

    const response = await axios.post<DeleteNotificationResponse>(url, {
        notification_id: notification_id,
    } as DeleteNotificationRequest);
    
    const result = response.data.result;

    if (result === 'success') {
        return result;
    }
    if (result === 'fail') {
        return 'failed';
    }
    else {
        return 'delete_notification failed';
    }
}

