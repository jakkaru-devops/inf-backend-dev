import httpStatus from 'http-status';
import { BaseController } from '../../../core/classes/base.controller';
import { SocketServer } from '../../../core/socket';
import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import { APIError } from '../../../utils/api.utils';
import { isManager } from '../../user/utils';
import ordersService from '../orders.service';

export class OrdersV2Controller extends BaseController {
  io: SocketServer;

  getOffer = createAPIMethod(
    { errorMessage: 'Не удалось загрузить предложение', runTransaction: false },
    async ({ req, authUser, authUserRole }) => {
      const { orderId, offerId } = req.params;

      const offer = await ordersService.getOffer({ orderId, offerId, authUser, authUserRole });

      return offer;
    },
  );

  updateOfferReceivingDate = createAPIMethod(
    { errorMessage: 'Не удалось обновить дату получения заказа', runTransaction: true },
    async ({ req, authUserRole, transaction }) => {
      const { orderId, offerId } = req.params;
      const { receivingDate } = req.body;
      const isAdmin = isManager(authUserRole);

      const resData = await ordersService.updateOfferReceivingDate(
        { orderId, offerId, receivingDate, isAdmin },
        { io: this.io, transaction },
      );

      return resData;
    },
  );

  confirmOfferPayment = createAPIMethod(
    { errorMessage: 'Не удалось подтвердить оплату заказа', runTransaction: true },
    async ({ req, res, authUserRole, transaction }) => {
      if (authUserRole.role.label !== 'operator')
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Действие запрещено',
        });

      const { orderId, offerId } = req.params;

      const resData = await ordersService.confirmOfferPayment({ orderId, offerId }, { io: this.io, transaction });

      return resData;
    },
  );

  cancelOrderPayment = createAPIMethod(
    { errorMessage: 'Не удалось отменить оплату заказ', runTransaction: true },
    async ({ req, res, authUserRole, transaction }) => {
      if (authUserRole.role.label !== 'operator')
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Действие запрещено',
        });

      const { orderId } = req.params;
      const { message } = req.body;
      const resData = await ordersService.cancelOrderPayment({ orderId, message }, { io: this.io, transaction });

      return resData;
    },
  );

  cancelOfferPayment = createAPIMethod(
    { errorMessage: 'Не удалось отменить оплату заказ', runTransaction: true },
    async ({ req, res, authUserRole, transaction }) => {
      if (authUserRole.role.label !== 'operator')
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Действие запрещено',
        });

      const { orderId, offerId } = req.params;
      const { message } = req.body;
      const resData = await ordersService.cancelOfferPayment(
        { orderId, offerId, message },
        { io: this.io, transaction },
      );

      return resData;
    },
  );

  generateAcceptanceActDocument = createAPIMethod(
    { errorMessage: 'Не удалось сформировать акт приема-передачи', runTransaction: true },
    async ({ req, res, authUserRole, transaction }) => {
      if (authUserRole.role.label !== 'seller')
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Действие запрещено',
        });

      const { orderId, offerId } = req.params;
      const { products } = req.body;
      const resData = await ordersService.generateAcceptanceActDocument(
        { orderId, offerId, products },
        { transaction },
      );
      return resData;
    },
  );

  getOffersAnalyticsDoc = createAPIMethod(
    { errorMessage: 'Не удалось составить аналитику предложений', runTransaction: false },
    async ({ req, authUser, authUserRole }) => {
      const { orderId } = req.params;
      const resData = await ordersService.getOffersAnalyticsDocExcel({ orderId, authUser, authUserRole });
      return resData;
    },
  );

  createPricedOrder = createAPIMethod(
    { errorMessage: 'Не удалось оформить заказ', runTransaction: true },
    async ({ req, authUser, transaction }) => {
      const { deliveryAddress } = req.body;
      const resData = await ordersService.createPricedOrder(
        {
          userId: authUser.id,
          deliveryAddress,
        },
        { io: this.io, transaction },
      );
      return resData;
    },
  );

  updateOrderDeleteStatus = createAPIMethod(
    { errorMessage: 'Не удалось удалить/восстановить запрос', runTransaction: true },
    async ({ req, res, authUser, authUserRole, transaction }) => {
      if (authUserRole.role.label !== 'manager')
        throw APIError({ res, status: httpStatus.FORBIDDEN, message: 'Действие запрещено' });

      const { orderId } = req.params;

      const resData = await ordersService.toggleOrderDeleteStatus(
        { authUserId: authUser.id, orderId },
        { transaction },
      );

      return resData;
    },
  );

  getPostponedPaymentList = createAPIMethod(
    { errorMessage: 'Не удалось получить список отсрочек платежей', runTransaction: false },
    async ({ req, res, authUser, authUserRole }) => {
      if (authUserRole.role.label === 'customer')
        return await ordersService.getPostponedPaymentListCustomer({ userId: authUser.id, pagination: req.query });
      else if (authUserRole.role.label === 'seller')
        return await ordersService.getPostponedPaymentListSeller({ userId: authUser.id, pagination: req.query });
      else throw APIError({ res, status: httpStatus.FORBIDDEN, message: 'Недостаточно прав' });
    },
  );

  createPostponedPayment = createAPIMethod(
    { errorMessage: 'Не удалось запросить отсрочку платежа', runTransaction: true },
    async ({ req, res, authUser, authUserRole, transaction }) => {
      if (authUserRole.role.label !== 'customer')
        throw APIError({ res, status: httpStatus.FORBIDDEN, message: 'Действие запрещено' });

      const { customerOrganizationId, warehouseId, daysRequested } = req.body;

      return await ordersService.createPostponedPayment(
        {
          customerId: authUser.id,
          customerOrganizationId,
          warehouseId,
          daysRequested,
        },
        { transaction },
      );
    },
  );

  updatePostponedPayment = createAPIMethod(
    { errorMessage: 'Не удалось обновить запрос на отсрочку платежа', runTransaction: true },
    async ({ req, res, authUser, authUserRole, transaction }) => {
      if (authUserRole.role.label !== 'seller')
        throw APIError({ res, status: httpStatus.FORBIDDEN, message: 'Действие запрещено' });

      const { id } = req.params;
      const { daysApproved, maxSum } = req.body;

      return await ordersService.updatePostponedPayment(
        {
          id: Number(id),
          sellerId: authUser.id,
          daysApproved,
          maxSum,
        },
        { transaction },
      );
    },
  );

  updatePostponedPaymentDaysRequested = createAPIMethod(
    { errorMessage: 'Не удалось обновить запрос на отсрочку платежа', runTransaction: true },
    async ({ req, res, authUser, authUserRole, transaction }) => {
      if (authUserRole.role.label !== 'customer')
        throw APIError({ res, status: httpStatus.FORBIDDEN, message: 'Действие запрещено' });

      const { id } = req.params;
      const { daysRequested } = req.body;

      return await ordersService.updatePostponedPaymentDaysRequested(
        {
          id: Number(id),
          customerId: authUser.id,
          daysRequested,
        },
        { transaction },
      );
    },
  );

  approveOfferPostponedPayment = createAPIMethod(
    { errorMessage: 'Не удалось сохранить данные', runTransaction: true },
    async ({ req, res, authUser, authUserRole, transaction }) => {
      if (authUserRole.role.label !== 'seller')
        throw APIError({ res, status: httpStatus.FORBIDDEN, message: 'Действие запрещено' });

      const { orderId, offerId } = req.params;
      const { paymentPostponeOverMaxSumApproved } = req.body;

      return await ordersService.approveOfferPostponedPayment(
        { orderId, offerId, sellerId: authUser.id, paymentPostponeOverMaxSumApproved },
        { transaction },
      );
    },
  );
}
