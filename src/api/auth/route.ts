import { Router } from 'express';
import SocketIO from 'socket.io';
import { AuthController } from './controllers/auth.controller';
import { requireAuth } from '../../middlewares/auth.mw';

const authRouter = (io: SocketIO.Server) => {
  const router = Router();
  const authController = new AuthController(io);

  router.route('/login').post(authController.login);
  router.route('/manager-login').get(requireAuth, authController.getUserToken);

  return router;
};

export default authRouter;
