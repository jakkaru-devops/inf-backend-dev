import httpStatus from 'http-status';
import { ServiceError } from '../../../core/utils/serviceError';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import { Transaction } from 'sequelize';
import ordersService from '../orders.service';
import { SocketServer } from '../../../core/socket';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import _ from 'lodash';

interface IProps {
  orderId: OrderRequest['id'];
  message: string;
}

export const cancelOrderPaymentService = async (
  { orderId, message }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const order = await OrderRequest.findByPk(orderId, { transaction });
  const nowDate = new Date();

  if (!order) throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Заказ не найден' });

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

  if (!(['PAID', 'COMPLETED'] as Array<OrderRequest['status']>).includes(order.status))
    throw new ServiceError({ status: httpStatus.FORBIDDEN, message: 'Заказ еще не оплачен' });

  const allOffers = await Order.findAll({
    where: {
      orderRequestId: order.id,
    },
    transaction,
  });

  await createOrderNotificationService({
    userId: order.customerId,
    role: 'customer',
    type: ENotificationType.orderInvoicePaymentCanceled,
    autoread: false,
    orderRequest: order,
    io,
    transaction,
  });

  await order.update(
    {
      cancelPaymentMessage: message,
    },
    { transaction },
  );

  for (const offer of allOffers) {
    const newOfferStatus: Order['status'] = !!offer.paymentPostponeAcceptedAt ? 'PAYMENT_POSTPONED' : 'OFFER';
    await offer.update(
      {
        status: newOfferStatus,
        paidSum: null,
        paidAt: null,
        sellerUpdatedAt: nowDate,
        sellerLastNotificationCreatedAt: nowDate,
      },
      { transaction },
    );

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
  }

  if (order.status === 'PAID') {
    const newOrderStatus: OrderRequest['status'] = !!order.paymentPostponeAcceptedAt ? 'PAYMENT_POSTPONED' : 'APPROVED';
    await order.update(
      {
        status: newOrderStatus,
        paymentDate: null,
        managerLastNotificationCreatedAt: nowDate,
        unpaidSellerIds: JSON.stringify(allOffers.map(offer => offer.sellerId)),
      },
      { transaction },
    );
  }
  if (order.status === 'COMPLETED') {
    await ordersService.revertOrderComplete({ order }, { io, transaction });
  }

  await updateOrderRequestUserStatusService({
    orderRequestId: order.id,
    sellerIds: allOffers.map(offer => offer.sellerId),
    transaction,
  });

  return {
    order,
  };
};
