import SocketIO from 'socket.io';
import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth.mw';
import NotificationCtrl from '../ctrl';

const notificationRouter = (io: SocketIO.Server) => {
  const router = Router();
  const notificationCtrl = new NotificationCtrl(io);

  router.route('/list').get(requireAuth, notificationCtrl.getNotificationList);

  router
    .route('/unread')
    .get(requireAuth, notificationCtrl.getUnreadNotificationsCount)
    .post(requireAuth, notificationCtrl.readNotification);

  router.route('/read-all').post(requireAuth, notificationCtrl.readAllNotifications);

  return router;
};

export default notificationRouter;
