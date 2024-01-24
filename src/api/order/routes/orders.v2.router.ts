import { Router } from 'express';
import { SocketServer } from '../../../core/socket';
import { OrdersV2Controller } from '../controllers/orders.v2.controller';
import { requireAuth, requirePermissions } from '../../../middlewares/auth.mw';

export const ordersV2Router = (io: SocketServer) => {
  const router = Router();
  const ordersV2Controller = new OrdersV2Controller(io);

  router
    .route('/:orderId/offers/:offerId')
    .get(requirePermissions('exploreOrderRequestsAndOrdersAvailable'), ordersV2Controller.getOffer);

  router
    .route('/:orderId/offers/:offerId/receiving-date')
    .patch(requireAuth, ordersV2Controller.updateOfferReceivingDate);

  router.route('/:orderId/offers/:offerId/confirm-payment').patch(requireAuth, ordersV2Controller.confirmOfferPayment);

  router.route('/:orderId/cancel-payment').patch(requireAuth, ordersV2Controller.cancelOrderPayment);

  router.route('/:orderId/offers/:offerId/cancel-payment').patch(requireAuth, ordersV2Controller.cancelOfferPayment);

  router
    .route('/:orderId/offers/:offerId/acceptance-act-document')
    .post(requireAuth, ordersV2Controller.generateAcceptanceActDocument);

  router.route('/:orderId/offers/analytics-document').get(requireAuth, ordersV2Controller.getOffersAnalyticsDoc);

  router
    .route('/priced')
    .post(requirePermissions('exploreOrderRequestsAndOrdersAvailable'), ordersV2Controller.createPricedOrder);

  router.route('/:orderId/deletion-status').patch(requireAuth, ordersV2Controller.updateOrderDeleteStatus);

  router
    .route('/postponed-payments')
    .get(requireAuth, ordersV2Controller.getPostponedPaymentList)
    .post(requireAuth, ordersV2Controller.createPostponedPayment);

  router.route('/postponed-payments/:id').put(requireAuth, ordersV2Controller.updatePostponedPayment);

  router
    .route('/postponed-payments/:id/days-requested')
    .patch(requireAuth, ordersV2Controller.updatePostponedPaymentDaysRequested);

  router
    .route('/:orderId/offers/:offerId/approve-postponed-payment')
    .patch(requireAuth, ordersV2Controller.approveOfferPostponedPayment);

  return router;
};
