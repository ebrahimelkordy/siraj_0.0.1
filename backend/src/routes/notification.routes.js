import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import * as notificationsController from '../controllers/NotificationsController.js';

const router = express.Router();

router.use(protectRoute);

// جلب إشعارات المستخدم
router.get('/', notificationsController.getUserNotifications);
// وضع كل الإشعارات كمقروءة
router.post('/read-all', notificationsController.markAllAsRead);
// وضع إشعار واحد كمقروء
router.post('/:notificationId/read', notificationsController.markAsRead);

export default router;
