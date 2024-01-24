import httpStatus from 'http-status';
import { ServiceError } from '../../../core/utils/serviceError';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import ordersService from '../orders.service';
import { SocketServer } from '../../../core/socket';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';

interface IProps {
  orderId: OrderRequest['id'];
  offerId: Order['id'];
  receivingDate: Date;
  isAdmin: boolean;
}

export const updateOfferReceivingDateService = async (
  { orderId, offerId, receivingDate, isAdmin }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const order = await OrderRequest.findByPk(orderId, { transaction });
  const offer = await Order.findByPk(offerId, { transaction });
  const nowDate = new Date();

  if (!order || !offer || offer.orderRequestId !== orderId)
    throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Заказ не найден' });

  // Overwrite is not allowed for non admin user
  if (!isAdmin && ((!!receivingDate && !!offer.receivingDate) || !receivingDate))
    throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Дата получения уже сохранена' });

  // Order has to be approved && (paid || payment postpone is approved)
  // Completed order's receivingDate is not allowed for non admin user
  if (!isAdmin && !(['PAID', 'PAYMENT_POSTPONED'] as Array<OrderRequest['status']>).includes(order.status))
    throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Обновление даты получения недоступно' });

  await offer.update(
    {
      receivingDate,
      sellerUpdatedAt: nowDate,
      sellerLastNotificationCreatedAt: nowDate,
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

  if (!!allOffers.length && allOffers.every(item => !!item.receivingDate && item.status === 'PAID')) {
    await ordersService.completeOrder({ order, offer }, { io, transaction });
  } else {
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
