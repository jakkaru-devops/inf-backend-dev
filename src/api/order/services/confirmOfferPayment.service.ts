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

interface IProps {
  orderId: OrderRequest['id'];
  offerId: Order['id'];
}

export const confirmOfferPaymentService = async (
  { orderId, offerId }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const order = await OrderRequest.findByPk(orderId, { transaction });
  const offer = await Order.findByPk(offerId, { transaction });
  const nowDate = new Date();

  if (!order || !offer || offer.orderRequestId !== orderId)
    throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Заказ не найден' });

  if (order.status !== 'PAYMENT_POSTPONED' || offer.status !== 'PAYMENT_POSTPONED')
    throw new ServiceError({ status: httpStatus.FORBIDDEN, message: 'Оплата заказа недоступна' });

  await offer.update(
    {
      status: 'PAID',
      paidSum: offer.totalPrice,
      paidAt: nowDate,
      sellerUpdatedAt: nowDate,
      sellerLastNotificationCreatedAt: nowDate,
      cancelPaymentMessage: null,
    },
    { transaction },
  );

  await createOrderNotificationService({
    userId: offer.sellerId,
    role: 'seller',
    type: ENotificationType.orderPaid,
    autoread: false,
    orderRequest: order,
    order: offer,
    io,
    transaction,
  });

  const allOffers = (
    await Order.findAll({
      where: {
        id: { [Op.ne]: offer.id },
        orderRequestId: order.id,
      },
      transaction,
    })
  ).concat(offer);

  if (!!allOffers.length && allOffers.every(item => item.status === 'PAID')) {
    await createOrderNotificationService({
      userId: order.customerId,
      role: 'customer',
      type: ENotificationType.orderInvoicePaymentConfirmed,
      autoread: false,
      orderRequest: order,
      io,
      transaction,
    });

    if (!!allOffers.length && allOffers.every(item => !!item.receivingDate)) {
      await ordersService.completeOrder({ order, offer }, { io, transaction });
    } else {
      await order.update(
        {
          status: 'PAID',
          paymentDate: nowDate,
          managerLastNotificationCreatedAt: nowDate,
          unpaidSellerIds: JSON.stringify([]),
          cancelPaymentMessage: null,
        },
        { transaction },
      );
    }
  } else {
    const organization = await Organization.findByPk(offer.organizationId);
    if (!!organization) {
      await createOrderNotificationService({
        userId: order.customerId,
        role: 'customer',
        type: ENotificationType.offerInvoicePaymentConfirmed,
        autoread: false,
        orderRequest: order,
        order: offer,
        supplierName: getOrgName(organization, true, true),
        io,
        transaction,
      });
    }
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
