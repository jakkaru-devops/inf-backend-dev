import { Op, Sequelize } from 'sequelize';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import SocketIO from 'socket.io';
import { executeTransaction } from '../../../utils/transactions.utils';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';
import _ from 'lodash';

export const getAndUpdateExpiredOffersService = async (io: SocketIO.Server) => {
  executeTransaction(async transaction => {
    try {
      let expiredOffers = (
        await Order.findAll({
          where: {
            offerExpiresAt: {
              [Op.lt]: Sequelize.literal('now()'),
            },
            isExpiredOffer: false,
          },
          include: [
            {
              model: OrderRequest,
              as: 'orderRequest',
              required: true,
              where: {
                status: 'REQUESTED',
              },
            },
          ],
          transaction,
        })
      ).map(el => el.toJSON() as Order);

      if (!expiredOffers.length) return;

      const nowDate = new Date();

      // Get unique offers
      expiredOffers = _.uniqBy(expiredOffers, 'id');

      // Send notifications to sellers
      for (const offer of expiredOffers) {
        await createOrderNotificationService({
          userId: offer.sellerId,
          role: 'seller',
          type: ENotificationType.offerExpired,
          autoread: false,
          orderRequest: offer.orderRequest,
          order: offer,
          io,
          transaction,
        });
      }

      // If one request has many expired offers send only 1 notification the customer
      const offersByRequests = _.uniqBy(expiredOffers, 'orderRequestId');
      for (const offer of offersByRequests) {
        const customerId = offer.orderRequest.customerId;

        await createOrderNotificationService({
          userId: customerId,
          role: 'customer',
          type: ENotificationType.offerExpired,
          autoread: false,
          orderRequest: offer.orderRequest,
          order: offer,
          io,
          transaction,
        });
      }

      // Mark offer as expired
      await Order.update(
        {
          isExpiredOffer: true,
        },
        {
          where: {
            id: { [Op.in]: expiredOffers.map(el => el.id) },
          },
          transaction,
        },
      );

      const orderRequestIds = _.uniq(expiredOffers.map(offer => offer.orderRequestId));
      for (const orderRequestId of orderRequestIds) {
        // Update notificaton time for managers (for customer and sellers it is done below by sending notifications)
        await OrderRequest.update(
          {
            managerLastNotificationCreatedAt: nowDate,
          },
          {
            where: {
              id: orderRequestId,
            },
            transaction,
          },
        );

        const sellerIds = expiredOffers
          .filter(offer => (offer.orderRequestId = orderRequestId))
          .map(offer => offer.sellerId);
        await updateOrderRequestUserStatusService({
          orderRequestId,
          sellerIds,
          transaction,
        });
      }
    } catch (err) {
      throw new Error('An error has occured during handling of expired offers');
    }
  });
};
