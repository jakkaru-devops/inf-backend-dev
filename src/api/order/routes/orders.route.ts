import { requireAuth } from '../../../middlewares/auth.mw';
import { Router } from 'express';
import { requirePermissions } from '../../../middlewares/auth.mw';
import { getUserLanguage } from '../../../middlewares/language.mw';
import OrderCtrl from '../controllers/orders.ctrl';
import SocketIO from 'socket.io';

const orderRouter = (io: SocketIO.Server) => {
  const router = Router();
  const orderCtrl = new OrderCtrl(io);

  router
    .route('/')
    .get(requirePermissions('exploreOrderRequestsAndOrdersAvailable'), orderCtrl.getOrderById)
    .post([requirePermissions('suggestOrdersAvailable'), getUserLanguage], orderCtrl.addOrderToRequest)
    .put(
      requirePermissions([
        'exploreAllOrderRequestsAvailable',
        'suggestOrdersAvailable',
        'manageOrderRequestsAvailable',
      ]),
      orderCtrl.updateOrder,
    )
    .patch(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.patchOrder)
    .delete(requirePermissions('suggestOrdersAvailable'), orderCtrl.deleteOrder);

  router.route('/requestToUpdate').post(requireAuth, orderCtrl.requestToUpdateOrder);

  router.route('/list').get(requireAuth, orderCtrl.getOrderList);

  router.route('/request/list').get(requireAuth, orderCtrl.getOrderRequestList);

  router.route('/request-list-doc-excel').get(requireAuth, orderCtrl.getOrderRequestListDocExcel);
  router.route('/order-list-doc-excel').get(requireAuth, orderCtrl.getOrderListDocExcel);
  router.route('/refund-exchange-list-doc-excel').get(requireAuth, orderCtrl.getRefundExchangeListDocExcel);
  router.route('/order-request-doc/:id').get([requireAuth, getUserLanguage], orderCtrl.getOrderRequestDoc);
  router
    .route('/order-request-doc/:id/offers')
    .get([requireAuth, getUserLanguage], orderCtrl.getOrderRequestOffersDocExcel);
  router.route('/order-doc/:id').get([requireAuth, getUserLanguage], orderCtrl.getOrderDocExcel);

  router.route('/history').get(requireAuth, orderCtrl.getOrderHistoryList);

  router
    .route('/request')
    .get([getUserLanguage, requirePermissions('exploreOrderRequestsAndOrdersAvailable')], orderCtrl.getOrderRequestById)
    .post(requirePermissions('requestOrdersPlusHistoryAvailable'), orderCtrl.createOrderRequest)
    .put(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.updateOrderRequest)
    .delete(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.deleteOrderRequest);

  router
    .route('/request/:id')
    .put(
      requirePermissions([
        'exploreAllOrderRequestsAvailable',
        'suggestOrdersAvailable',
        'manageOrderRequestsAvailable',
      ]),
      orderCtrl.updateOrderRequestManager,
    );

  router
    .route('/request/offers')
    .get(
      [getUserLanguage, requirePermissions('exploreOrderRequestsAndOrdersAvailable')],
      orderCtrl.getOffersByOrderRequestId,
    );

  router
    .route('/request/offers/relevance')
    .get(
      [getUserLanguage, requirePermissions('exploreOrderRequestsAndOrdersAvailable')],
      orderCtrl.getOrderRequestOffersRelevance,
    );

  router
    .route('/request/offers/state')
    .get([getUserLanguage, requirePermissions('exploreOrderRequestsAndOrdersAvailable')], orderCtrl.getOffersState);

  router
    .route('/request/partly-paid')
    .put(requirePermissions('exploreOrderRequestsAndOrdersAvailable'), orderCtrl.updatePartlyPaidOrder);

  router
    .route('/request/as-seller')
    .get(
      [getUserLanguage, requirePermissions('exploreOrderRequestsAndOrdersAvailable')],
      orderCtrl.getOrderRequestAsSeller,
    );

  router
    .route('/request/approve')
    .post(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.approveOrderRequest);

  router
    .route('/request/selected-list')
    .get([getUserLanguage, requirePermissions('manageOrderRequestsAvailable')], orderCtrl.getSelectedProductListDocPdf)
    .patch(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.unselectAllProducts);

  router
    .route('/request/decline')
    .post(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.declineOrderRequest);

  router
    .route('/request/payment')
    .post(requirePermissions('exploreAllOrderRequestsAvailable'), orderCtrl.payOrderRequest);

  router
    .route('/request/partial-payment')
    .post(requirePermissions('exploreAllOrderRequestsAvailable'), orderCtrl.markOrderRequestPartialPayment);

  router.route('/request/accept-payment-postpone').post(requireAuth, orderCtrl.acceptOrderPaymentPostpone);

  router
    .route('/request/offers-payment')
    .post(requirePermissions('exploreAllOrderRequestsAvailable'), orderCtrl.payOrderRequestOffers);

  router
    .route('/request/payment-refund-request')
    .post(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.requestPaymentRefund);

  router
    .route('/request/pay-refund-request')
    .post(requirePermissions('exploreAllOrderRequestsAvailable'), orderCtrl.payPaymentRefundRequest);

  router
    .route('/request/complete')
    .post(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.completeOrderRequest);

  router
    .route('/refund-exchange/all')
    .get(requirePermissions('exploreAllOrderRequestsAvailable'), orderCtrl.getAllOrdersWithRefundExchangeRequests);

  router
    .route('/refund-exchange/list')
    .get(
      requirePermissions(['exploreOrderRequestsAndOrdersAvailable', 'suggestOrdersAvailable']),
      orderCtrl.getOrderListWithRefundExchangeRequests,
    );

  router
    .route('/refund-exchange')
    .post(requirePermissions('requestOrdersPlusHistoryAvailable'), orderCtrl.requestRefundExchange)
    .put(requireAuth, orderCtrl.updateRefundExchange);

  router.route('/reward/list').get(requireAuth, orderCtrl.getAllRewards);

  router.route('/reward').put(requirePermissions('exploreAllOrderRequestsAvailable'), orderCtrl.updateReward);

  router.route('/reward/list/month').get(requireAuth, orderCtrl.getMonthRewardList);

  router
    .route('/attachments')
    .post(requireAuth, orderCtrl.uploadAttachment)
    .delete(requireAuth, orderCtrl.deleteAttachment);

  router.route('/acceptance-act').get(requireAuth, orderCtrl.generateAcceptanceAct);

  router
    .route('/change-shipping-condition/:id')
    .patch(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.applicationShippingCondition);
  router
    .route('/approved-shipping-condition/:id')
    .patch(requirePermissions('exploreOrderRequestsAndOrdersAvailable'), orderCtrl.approvedShippingCondition);
  router
    .route('/reason-to-reject-condition/:id')
    .get(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.getReasonReject)
    .delete(requirePermissions('manageOrderRequestsAvailable'), orderCtrl.deleteReasonReject);

  return router;
};

export default orderRouter;
