import { banbury } from "@banbury/core";

export async function fetchNotifications(username: string, setNotifications: (notifications: any[]) => void) {
    try {
        const response = await banbury.notifications.getNotifications(username);
        // Ensure we're setting an array, even if response.notifications is undefined
        setNotifications(Array.isArray(response?.notifications) ? response.notifications : []);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        // Set empty array on error
        setNotifications([]);
    }
}
