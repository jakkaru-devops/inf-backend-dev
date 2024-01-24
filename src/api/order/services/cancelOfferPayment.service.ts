import httpStatus from 'http-status';
import { ServiceError } from '../../../core/utils/serviceError';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import ordersService from '../orders.service';
import { SocketServer } from '../../../core/socket';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import Organization from '../../organization/models/Organization.model';
import { getOrgName } from '../../organization/utils';
import _ from 'lodash';

interface IProps {
  orderId: OrderRequest['id'];
  offerId: Order['id'];
  message: string;
}

export const cancelOfferPaymentService = async (
  { orderId, offerId, message }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const order = await OrderRequest.findByPk(orderId, { transaction });
  const offer = await Order.findByPk(offerId, { transaction });
  const nowDate = new Date();

  if (!order || !offer || offer.orderRequestId !== orderId)
    throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Заказ не найден' });

  if (order.status === 'DECLINED')
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: 'Заказ был отменен',
    });

  if (order.paymentType === 'card')
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: 'Отменить оплату невозможно. Заказ оплачен картой',
    });

  if (!(['PAID', 'COMPLETED'] as Array<OrderRequest['status']>).includes(order.status) && offer.status !== 'PAID')
    throw new ServiceError({ status: httpStatus.FORBIDDEN, message: 'Заказ еще не оплачен' });

  const newOfferStatus: Order['status'] = !!offer.paymentPostponeAcceptedAt ? 'PAYMENT_POSTPONED' : 'OFFER';
  await offer.update(
    {
      status: newOfferStatus,
      paidSum: null,
      paidAt: null,
      sellerUpdatedAt: nowDate,
      sellerLastNotificationCreatedAt: nowDate,
      cancelPaymentMessage: message,
    },
    { transaction },
  );

  const allOffers = (
    await Order.findAll({
      where: {
        id: { [Op.ne]: offer.id },
        orderRequestId: order.id,
      },
      transaction,
    })
  ).concat(offer);

  if (allOffers.length > 1) {
    const organization = await Organization.findByPk(offer.organizationId);
    if (!!organization) {
      await createOrderNotificationService({
        userId: order.customerId,
        role: 'customer',
        type: ENotificationType.offerInvoicePaymentCanceled,
        autoread: false,
        orderRequest: order,
        order: offer,
        supplierName: getOrgName(organization, true, true),
        io,
        transaction,
      });
    }
  } else {
    await createOrderNotificationService({
      userId: order.customerId,
      role: 'customer',
      type: ENotificationType.orderInvoicePaymentCanceled,
      autoread: false,
      orderRequest: order,
      order: offer,
      io,
      transaction,
    });
  }

  await createOrderNotificationService({
    userId: offer.sellerId,
    role: 'seller',
    type: ENotificationType.orderInvoicePaymentCanceled,
    autoread: false,
    orderRequest: order,
    order: offer,
    io,
    transaction,
  });

  if (order.status === 'PAID') {
    const newOrderStatus: OrderRequest['status'] = !!order.paymentPostponeAcceptedAt ? 'PAYMENT_POSTPONED' : 'APPROVED';
    const unpaidSellerIds = JSON.stringify(
      _.uniq((JSON.parse(order.unpaidSellerIds || '[]') as string[]).concat(offer.sellerId)),
    );
    await order.update(
      {
        status: newOrderStatus,
        paymentDate: null,
        managerLastNotificationCreatedAt: nowDate,
        unpaidSellerIds,
      },
      { transaction },
    );
  }
  if (order.status === 'COMPLETED') {
    await ordersService.revertOrderComplete({ order, offer }, { io, transaction });
  }

  await updateOrderRequestUserStatusService({
    orderRequestId: order.id,
    sellerIds: [offer.sellerId],
    transaction,
  });

  return {
    order,
    offer,
  };
};
