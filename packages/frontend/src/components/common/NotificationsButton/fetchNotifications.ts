import { banbury } from "@banbury/core";
import { NotificationsTable } from "@banbury/core/src/types/Types";

export async function fetchNotifications(setNotifications: (notifications: NotificationsTable[]) => void) {
    try {
        const response = await banbury.notifications.getNotifications();
        // Ensure we're setting an array, even if response is undefined
        setNotifications(Array.isArray(response) ? response : []);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        // Set empty array on error
        setNotifications([]);
    }
}
