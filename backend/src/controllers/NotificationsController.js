import Notification from '../models/Notification.js';

// Fetch all notifications for a user
export async function getUserNotifications(req, res) {
    try {
        const userId = req.user._id;
        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
}

// Mark all notifications as read
export async function markAllAsRead(req, res) {
    try {
        const userId = req.user._id;
        await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update notifications' });
    }
}

// Mark a single notification as read
export async function markAsRead(req, res) {
    try {
        const { notificationId } = req.params;
        await Notification.findByIdAndUpdate(notificationId, { $set: { read: true } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
}

// Create a new notification (for use from the code only)
export async function createNotification(user, type, message, group = null, requestId = null) {
    const notif = await Notification.create({ user, type, message, group, requestId });
    return notif;
}
