import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const notificationsController = new NotificationsController();

router.use(authenticate);

router.get('/', notificationsController.getNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/read-all', notificationsController.markAllAsRead);

export default router;