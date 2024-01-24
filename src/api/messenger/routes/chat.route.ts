import { Router } from 'express';
import SocketIO from 'socket.io';

import { requireAuth, requirePermissions } from '../../../middlewares/auth.mw';
import ChatCtrl from '../controllers/chat.ctrl';

const chatRouter = (io: SocketIO.Server) => {
  const router = Router();
  const chatCtrl = new ChatCtrl(io);

  router.route('/').get(requireAuth, chatCtrl.getChat).post(requireAuth, chatCtrl.createChat);

  router.route('/unread').get(requireAuth, chatCtrl.getUnreadMessagesCount).post(requireAuth, chatCtrl.readChat);

  router.route('/unread/support').get(requireAuth, chatCtrl.getUnreadSupportMessagesCount);

  router.route('/list').get(requireAuth, chatCtrl.getChatList);

  router.route('/list/support').get(requirePermissions('supportChatsAvailable'), chatCtrl.getSupportChatList);

  router
    .route('/message')
    .get(requireAuth, chatCtrl.getChatMessages)
    .post(requireAuth, chatCtrl.createMessage)
    .delete(requireAuth, chatCtrl.deleteMessage);

  router
    .route('/support-message')
    .get(requireAuth, chatCtrl.getSupportChatMessages)
    .post(requireAuth, chatCtrl.createSupportMessage);

  router
    .route('/active-appeals-count')
    .get(requirePermissions('supportChatsAvailable'), chatCtrl.getActiveAppealsCount);

  return router;
};

export default chatRouter;
