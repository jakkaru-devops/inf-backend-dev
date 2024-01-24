import { Transaction } from 'sequelize';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import { SocketServer } from '../../../core/socket';

interface IProps {
  order: OrderRequest;
  offer?: Order;
}

export const revertOrderCompleteService = async (
  { order, offer }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const nowDate = new Date();

  if (order.status !== 'COMPLETED') return;

  const allOffers = await Order.findAll({
    where: {
      orderRequestId: order.id,
    },
    transaction,
  });
  if (!!allOffers.length && allOffers.every(item => !!item.receivingDate && item.status === 'PAID')) return;

  const newStatus: OrderRequest['status'] = allOffers.some(item => item.paymentPostponeAcceptedAt)
    ? 'PAYMENT_POSTPONED'
    : 'PAID';
  await order.update(
    {
      status: newStatus,
      completionDate: null,
      customerLastNotificationCreatedAt: nowDate,
      managerLastNotificationCreatedAt: nowDate,
    },
    { transaction },
  );
};
