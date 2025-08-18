import { axiosInstance } from './axios.js';

export async function getUserNotifications() {
    const res = await axiosInstance.get('/notifications');
    return res.data;
}

export async function markAllNotificationsAsRead() {
    const res = await axiosInstance.post('/notifications/read-all');
    return res.data;
}

export async function markNotificationAsRead(notificationId) {
    const res = await axiosInstance.post(`/notifications/${notificationId}/read`);
    return res.data;
}
