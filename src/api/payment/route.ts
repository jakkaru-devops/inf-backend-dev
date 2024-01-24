import { Router } from 'express';
import PaymentCtrl from './ctrl';
import SocketIO from 'socket.io';

const paymentRouter = (io: SocketIO.Server) => {
  const router = Router();
  const paymentCtrl = new PaymentCtrl(io);

  router.route('/callback').post(paymentCtrl.callback);

  router.route('/email-test').post(paymentCtrl.testEmail);

  return router;
};

export default paymentRouter;
