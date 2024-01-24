import { Request, Response } from 'express';
import { Transaction } from 'sequelize';
import SocketIO from 'socket.io';
import OrderRequest from '../models/OrderRequest.model';
import { APIError } from '../../../utils/api.utils';
import httpStatus from 'http-status';
import Order from '../models/Order.model';
import Organization from '../../organization/models/Organization.model';
import RequestProduct from '../models/RequestProduct.model';
import { SERVICE_ORGANIZATION_INN } from '../../organization/data';
import { generateSpecificationService } from './generateSpecification.service';
import Notification from '../../notification/models/Notification.model';
import Role from '../../role/models/Role.model';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';

interface IProps {
  orderRequestId: string;
  io: SocketIO.Server;
  req: Request;
  res: Response;
  transaction: Transaction;
}

export const acceptOrderPaymentPostponeService = async ({ orderRequestId, io, req, res, transaction }: IProps) => {
  const orderRequest = await OrderRequest.findByPk(orderRequestId, { transaction });
  if (!orderRequest)
    throw APIError({
      res,
      status: httpStatus.BAD_REQUEST,
      message: 'Заказ не найден',
    });

  if (orderRequest.status === 'REQUESTED') {
    throw APIError({
      res,
      status: httpStatus.FORBIDDEN,
      message: 'Ошибка. Счета еще не сформированы',
    });
  }

  if ((['PAYMENT_POSTPONED', 'PAID', 'COMPLETED'] as Array<OrderRequest['status']>).includes(orderRequest.status))
    throw APIError({
      res,
      status: httpStatus.FORBIDDEN,
      message: 'Ошибка. Заказ уже оплачен',
    });

  if (!orderRequest?.paymentPostponedAt)
    throw APIError({
      res,
      status: httpStatus.BAD_REQUEST,
      message: 'Отсрочка платежа не разрешена',
    });

  const nowDate = new Date();

  const updatedOrderRequest = await orderRequest.update(
    {
      status: 'PAYMENT_POSTPONED',
      paymentPostponeAcceptedAt: nowDate,
      customerLastNotificationCreatedAt: nowDate,
      managerLastNotificationCreatedAt: nowDate,
    },
    { transaction },
  );

  const offers = await Order.findAll({
    where: {
      orderRequestId: orderRequest.id,
    },
    include: [
      { model: Organization, as: 'organization' },
      { model: RequestProduct, as: 'products' },
    ],
    transaction,
  });
  const selectedOffers = offers.filter(offer => offer?.products?.some(({ isSelected }) => isSelected));
  const selectedOfferIds = selectedOffers.map(offer => offer.id);

  if (offers.some(offer => !offer?.paymentPostponedAt))
    throw APIError({
      res,
      status: httpStatus.BAD_REQUEST,
      message: 'Все продавцы должны согласовать отсрочку',
    });

  // Get offers and offered product IDs that customer didn't select and delete them all
  const deleteOfferIds = offers.map(offer => offer.id).filter(id => !selectedOfferIds.includes(id));
  const deleteOfferedProductIds = offers
    .flatMap(({ products }) => products.map(({ id, isSelected }) => !isSelected && id))
    .filter(Boolean);
  const unselectedSellerIds = offers.filter(offer => deleteOfferIds.includes(offer.id)).map(offer => offer.sellerId);

  await Order.destroy({ where: { id: deleteOfferIds }, transaction });
  await RequestProduct.destroy({ where: { id: deleteOfferedProductIds }, transaction });
  await updatedOrderRequest.update(
    {
      unpaidSellerIds: JSON.stringify(unselectedSellerIds),
    },
    { transaction },
  );

  // Update selected offers
  await Order.update(
    {
      status: 'PAYMENT_POSTPONED',
      paymentPostponeAcceptedAt: nowDate,
    },
    {
      where: { id: selectedOfferIds },
      transaction,
    },
  );

  // Generate specification for special clients
  for (const offer of selectedOffers) {
    const organization = await Organization.findByPk(offer?.organizationId, { transaction });
    if (organization?.inn !== SERVICE_ORGANIZATION_INN) continue;

    await generateSpecificationService({
      orderRequestId: orderRequest.id,
      orderId: offer.id,
      req,
      res,
      transaction,
    });
  }

  // Notifications block start
  await Notification.update(
    {
      viewedAt: nowDate,
    },
    {
      where: {
        orderRequestId: orderRequest.id,
        viewedAt: null,
      },
      transaction,
    },
  );

  const sellerIds = selectedOffers.map(item => item.sellerId);
  for (const sellerId of sellerIds) {
    await createOrderNotificationService({
      userId: sellerId,
      role: 'seller',
      type: ENotificationType.orderPaymentPostponed,
      autoread: false,
      orderRequest,
      order: selectedOffers.find(offer => offer.sellerId === sellerId),
      io,
      transaction,
    });
  }

  await createOrderNotificationService({
    userId: orderRequest.customerId,
    role: 'customer',
    type: ENotificationType.orderPaymentPostponed,
    autoread: false,
    orderRequest,
    io,
    transaction,
  });
  // Notifications block end

  await updateOrderRequestUserStatusService({
    orderRequestId: orderRequest.id,
    transaction,
  });

  return {
    orderRequest: updatedOrderRequest,
  };
};
