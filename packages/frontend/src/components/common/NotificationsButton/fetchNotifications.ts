import { banbury } from "@banbury/core";

export async function fetchNotifications(username: string, setNotifications: (notifications: any) => void) {
    try {
        const response = await banbury.notifications.getNotifications(username);
        setNotifications(response.notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}
