import { Transaction } from 'sequelize';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import { SocketServer } from '../../../core/socket';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';

interface IProps {
  order: OrderRequest;
  offer: Order;
}

export const completeOrderService = async (
  { order, offer }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const nowDate = new Date();

  if (order.status === 'COMPLETED') return;

  const allOffers = await Order.findAll({
    where: {
      orderRequestId: order.id,
    },
    transaction,
  });
  if (!allOffers.every(item => !!item.receivingDate && item.status === 'PAID')) return;

  for (const offer of allOffers) {
    await offer.update({ cancelPaymentMessage: null }, { transaction });
  }

  await order.update(
    {
      status: 'COMPLETED',
      completionDate: nowDate,
      customerLastNotificationCreatedAt: nowDate,
      managerLastNotificationCreatedAt: nowDate,
      cancelPaymentMessage: null,
    },
    { transaction },
  );

  // Notifications block start
  const sellerIds = allOffers.map(item => item.sellerId);

  for (const sellerId of sellerIds) {
    await createOrderNotificationService({
      userId: sellerId,
      role: 'seller',
      type: ENotificationType.orderCompleted,
      autoread: false,
      orderRequest: order,
      io,
      transaction,
    });
  }

  await createOrderNotificationForAllManagersService({
    type: ENotificationType.orderCompleted,
    autoread: false,
    orderRequest: order,
    order: offer,
    io,
    transaction,
  });

  await createOrderNotificationService({
    userId: order.customerId,
    role: 'customer',
    type: ENotificationType.orderCompleted,
    autoread: false,
    orderRequest: order,
    order: offer,
    io,
    transaction,
  });
  // Notifications block end
};
