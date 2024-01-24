import { gaussRound, transformObjectKeysCase } from './../../utils/common.utils';
import {
  NODEMAILER_EMAIL,
  NODEMAILER_HOST,
  NODEMAILER_PASSWORD,
  NODEMAILER_PORT,
  NODEMAILER_SECURED,
} from './../../config/env';
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { executeTransaction } from '../../utils/transactions.utils';
import OrderRequest from '../order/models/OrderRequest.model';
import { APIError, APIResponse } from './../../utils/api.utils';
import Order from '../order/models/Order.model';
import { createOrderNotificationService } from '../notification/services/createOrderNotification.service';
import { ENotificationType } from '../notification/interfaces';
import Role from '../role/models/Role.model';
import SocketIO from 'socket.io';
import Notification from '../notification/models/Notification.model';
import User from '../user/models/User.model';
import UserRoles from '../role/models/UserRoles.model';
import nodemailer from 'nodemailer';
import { updateOrderRequestUserStatusService } from '../order/services/updateOrderRequestUserStatus.service';
import RequestProduct from '../order/models/RequestProduct.model';
import Organization from '../organization/models/Organization.model';
import OrderRequestFile from '../order/models/OrderRequestFile.model';
import { createOrderNotificationForAllManagersService } from '../notification/services/createOrderNotificationForAllManagers.service';
import { PricedProductReservation } from '../catalog/models/PricedProductReservation.model';
import StockBalance from '../catalog/models/StockBalance.model';
import catalogService from '../catalog/catalog.service';

class PaymentCtrl {
  io: SocketIO.Server;

  constructor(io: SocketIO.Server) {
    this.io = io;
  }
  /**
   * @desc      Payments notification handler
   * @route     POST /payment/callback
   * @body      any
   * @success  `OK ${hash}` or OK
   * @access    Private: manageOrderRequestsAvailable
   */
  callback = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const data: {
          mdOrder: string;
          orderNumber: string;
          operation: 'approved' | 'declinedByTimeout' | 'deposited' | 'reversed' | 'refunded';
          status: 1 | 0;
          sign_alias?: string;
          checksum?: string;
          callbackCreationDate?: string;
          amount?: number;
        } = req.body as any;

        const paidAt = new Date();

        const orderRequest = await OrderRequest.findOne({
          where: {
            paymentId: data.mdOrder,
          },
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
        if (!orderRequest) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Заказ не найден',
          });
        }

        if (!data?.status) {
          return res.status(httpStatus.FORBIDDEN).send(`Error`);
        }

        let orders = await Order.findAll({
          where: {
            orderRequestId: orderRequest.id,
          },
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: RequestProduct,
              as: 'products',
              required: true,
            },
          ],
          transaction,
        });
        orders = orders.map(el => el.toJSON() as Order);

        const selectedOffers = orders
          .map(
            offer =>
              ({
                ...offer,
                products: offer.products.filter(({ isSelected, count }) => isSelected && !!count),
              } as Order),
          )
          .filter(({ products }) => !!products.length);

        const paidAmount = gaussRound(
          selectedOffers
            .flatMap(({ products }) => products.map(({ unitPrice, count }) => unitPrice * count))
            .reduce((a, b) => a + b, 0),
          2,
        );

        // Update entities
        await orderRequest.update(
          {
            status: 'PAID',
            paymentDate: paidAt,
            paidSum: paidAmount,
            unpaidSellerIds: JSON.stringify([]),
            customerLastNotificationCreatedAt: new Date(),
          },
          { transaction },
        );

        for (const offer of selectedOffers) {
          const orderPrice = gaussRound(
            offer.products.map(({ unitPrice, count }) => unitPrice * count).reduce((a, b) => a + b, 0),
            2,
          );
          await Order.update(
            {
              status: 'PAID',
              paidSum: orderPrice,
              paidAt,
            },
            {
              where: {
                id: offer.id,
              },
              transaction,
            },
          );

          for (const offerProduct of offer.products) {
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
        }

        await OrderRequestFile.destroy({
          where: {
            orderRequestId: orderRequest.id,
            group: 'invoice',
          },
          transaction,
        });

        for (const order of orders) {
          const selectedOffer = selectedOffers?.find(el => el.id === order.id);
          if (!selectedOffer) {
            await Order.destroy({ where: { id: order.id }, transaction });
            continue;
          }
          for (const product of order.products) {
            if (!selectedOffer.products.find(el => el.id === product.id)) {
              await RequestProduct.destroy({ where: { id: product.id }, transaction });
            }
          }
        }

        for (const notification of orderRequest.unreadNotifications) {
          await notification.update(
            {
              viewedAt: new Date(),
            },
            {
              transaction,
            },
          );
        }

        // Notifications block start
        const sellerIds = orderRequest.orders.map(item => item.sellerId);
        for (const sellerId of sellerIds) {
          await createOrderNotificationService({
            userId: sellerId,
            role: 'seller',
            type: ENotificationType.orderPaid,
            autoread: false,
            orderRequest,
            order: orderRequest.orders.find(order => order.sellerId === sellerId),
            io: this.io,
            transaction,
          });
        }

        await createOrderNotificationForAllManagersService({
          type: ENotificationType.orderPaid,
          autoread: false,
          orderRequest,
          io: this.io,
          res,
          transaction,
        });
        // Notifications block end

        await updateOrderRequestUserStatusService({
          orderRequestId: orderRequest.id,
          transaction,
        });

        return res.status(httpStatus.OK).send(`OK`);
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при подтверждении статуса платежа',
          error: err,
        });
      }
    });
  };

  testEmail = async (req: Request, res: Response) => {
    try {
      const email = 'ikanslay@gmail.com';
      const transporterParams = {
        host: NODEMAILER_HOST,
        port: NODEMAILER_PORT,
        auth: {
          user: NODEMAILER_EMAIL,
          pass: NODEMAILER_PASSWORD,
        },
      };
      if (NODEMAILER_SECURED) {
        transporterParams['secure'] = true;
        transporterParams['tls'] = {
          rejectUnauthorized: false,
        };
      }
      const transporter = nodemailer.createTransport(transporterParams);

      const html = `<p>Тест - проверка работы</p>`;

      const message = {
        from: `"INF" <${NODEMAILER_EMAIL}>`,
        to: email,
        subject: `INF Test`,
        text: '',
        html,
      };

      const a = await transporter.sendMail(message);

      console.log(a);

      return APIResponse({
        res,
        data: {
          message: 'Email sent',
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Email не отправлен',
        error: err,
      });
    }
  };
}

export default PaymentCtrl;
