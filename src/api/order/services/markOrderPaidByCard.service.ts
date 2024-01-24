import { Transaction } from 'sequelize';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import OrderRequest from '../models/OrderRequest.model';
import Order from '../models/Order.model';
import { Op } from 'sequelize';
import RequestProduct from '../models/RequestProduct.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import Notification from '../../notification/models/Notification.model';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import { SocketServer } from '../../../core/socket';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';

interface IProps {
  order: OrderRequest;
  juristicSubjectId?: JuristicSubject['id'];
  totalPrice: number;
  selectedOffers: Order[];
}

export const markOrderPaidByCardService = async (
  { order, juristicSubjectId, totalPrice, selectedOffers }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const nowDate = new Date();
  await order.update(
    {
      payerId: juristicSubjectId,
      status: 'PAID',
      paymentDate: nowDate,
      paidSum: totalPrice,
      unpaidSellerIds: JSON.stringify([]),
      customerLastNotificationCreatedAt: nowDate,
      managerLastNotificationCreatedAt: nowDate,
    },
    { transaction },
  );

  for (const offer of selectedOffers) {
    await offer.update(
      {
        status: 'PAID',
        paidSum: offer.totalPrice,
        paidAt: nowDate,
      },
      { transaction },
    );
    await RequestProduct.destroy({
      where: {
        orderId: offer.id,
        isSelected: false,
      },
      transaction,
    });
  }

  await Order.destroy({
    where: {
      id: { [Op.notIn]: selectedOffers.map(offer => offer.id) },
      orderRequestId: order.id,
    },
    transaction,
  });

  await OrderRequestFile.destroy({
    where: {
      orderRequestId: order.id,
      group: 'invoice',
    },
    transaction,
  });

  await Notification.update(
    {
      viewedAt: nowDate,
    },
    {
      where: {
        orderRequestId: order.id,
        viewedAt: null,
      },
      transaction,
    },
  );

  for (const offer of selectedOffers) {
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
  }

  // Notifications block start
  await createOrderNotificationForAllManagersService({
    type: ENotificationType.orderPaid,
    autoread: false,
    orderRequest: order,
    io,
    transaction,
  });
  // Notifications block end

  await updateOrderRequestUserStatusService({
    orderRequestId: order.id,
    transaction,
  });

  return order;
};
