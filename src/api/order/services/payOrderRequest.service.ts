import e, { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Transaction, Sequelize, Op } from 'sequelize';
import SocketIO from 'socket.io';
import { APIError } from '../../../utils/api.utils';
import { ENotificationType } from '../../notification/interfaces';
import Notification from '../../notification/models/Notification.model';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import Role from '../../role/models/Role.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';
import { generateSpecificationService } from './generateSpecification.service';
import Organization from '../../organization/models/Organization.model';
import { SERVICE_ORGANIZATION_INN } from '../../organization/data';
import { PricedProductReservation } from '../../catalog/models/PricedProductReservation.model';
import StockBalance from '../../catalog/models/StockBalance.model';
import catalogService from '../../catalog/catalog.service';

interface IProps {
  orderRequestId: string;
  io: SocketIO.Server;
  req: Request;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  orderRequest: OrderRequest;
}

export const payOrderRequestService = async ({
  orderRequestId,
  io,
  req,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const orderRequest = await OrderRequest.findOne({
      where: {
        id: orderRequestId,
      },
      include: [
        {
          model: Order,
          as: 'orders',
          include: [
            {
              model: RequestProduct,
              as: 'products',
            },
          ],
        },
      ],
      transaction,
    });

    if (['PAID', 'COMPLETED'].includes(orderRequest.status)) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Ошибка. Заказ уже оплачен',
      });
    }

    const updatedOrderRequest = await orderRequest.update(
      {
        status:
          !!orderRequest.orders.length && orderRequest.orders.every(offer => !!offer.receivingDate)
            ? 'COMPLETED'
            : 'PAID',
        paymentDate: new Date(),
        managerLastNotificationCreatedAt: new Date(),
        cancelPaymentMessage: null,
      },
      { transaction },
    );

    // Get order and requested product IDs in order request,
    // that user didn't select to delete them all
    const deleteOrderIds = orderRequest.orders
      .map(({ id, products }) => !products.some(({ isSelected }) => isSelected) && id)
      .filter(Boolean);
    const deleteRequestProductIds = orderRequest.orders
      .flatMap(({ products }) => products.map(({ id, isSelected }) => !isSelected && id))
      .filter(Boolean);
    const unpaidSellerIds = orderRequest.orders.filter(el => deleteOrderIds.includes(el.id)).map(el => el.sellerId);

    await Order.destroy({ where: { id: deleteOrderIds }, transaction });
    await RequestProduct.destroy({ where: { id: deleteRequestProductIds }, transaction });
    await updatedOrderRequest.update(
      {
        unpaidSellerIds: JSON.stringify(unpaidSellerIds),
      },
      {
        transaction,
      },
    );

    await Order.update(
      {
        paidAt: new Date(),
        status: 'PAID',
        cancelPaymentMessage: null,
      },
      {
        where: {
          id: orderRequest.orders.map(el => el.id).filter(id => !deleteOrderIds.includes(id)),
        },
        transaction,
      },
    );

    for (const offer of orderRequest.orders) {
      if (deleteOrderIds.includes(offer.id)) continue;

      for (const offerProduct of offer.products) {
        if (deleteRequestProductIds.includes(offerProduct.id)) continue;

        const reservation = await PricedProductReservation.findOne({
          where: {
            offerProductId: offerProduct.id,
          },
          transaction,
        });

        if (!!reservation) {
          const priceOffer = await StockBalance.findByPk(reservation.priceOfferId, {
            transaction,
          });

          if (!!priceOffer) {
            await priceOffer.update(
              {
                amount: priceOffer.amount - reservation.quantity,
              },
              { transaction },
            );
          }
        }

        await catalogService.updateProductMinPrice({ productId: offerProduct.productId }, { transaction });
      }

      const organization = await Organization.findByPk(offer?.organizationId, { transaction });
      if (organization?.inn !== SERVICE_ORGANIZATION_INN || !offer?.contractId) continue;

      // Generate specification for special clients
      await generateSpecificationService({
        orderRequestId: orderRequest.id,
        orderId: offer.id,
        req,
        res,
        transaction,
      });
    }

    await PricedProductReservation.destroy({
      where: {
        orderId: orderRequest.id,
      },
      transaction,
    });

    // Notifications block start
    const changedOrderRequest = await OrderRequest.findByPk(orderRequest.id, {
      include: [
        {
          model: Order,
          as: 'orders',
        },
        {
          model: Notification,
          as: 'unreadNotifications',
        },
      ],
      transaction,
    });

    for (const notification of changedOrderRequest.unreadNotifications) {
      await notification.update(
        {
          viewedAt: new Date(),
        },
        {
          transaction,
        },
      );
    }

    const sellerIds = changedOrderRequest.orders.map(item => item.sellerId);
    for (const sellerId of sellerIds) {
      await createOrderNotificationService({
        userId: sellerId,
        role: 'seller',
        type: ENotificationType.orderPaid,
        autoread: false,
        orderRequest,
        order: orderRequest.orders.find(order => order.sellerId === sellerId),
        io,
        transaction,
      });
    }

    await createOrderNotificationService({
      userId: orderRequest.customerId,
      role: 'customer',
      type: ENotificationType.orderInvoicePaymentConfirmed,
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
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при оплате заказа',
      error: err,
    });
  }
};
