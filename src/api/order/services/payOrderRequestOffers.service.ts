import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Transaction, Op } from 'sequelize';
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
  offersData: Order[];
  io: SocketIO.Server;
  req: Request;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  orderRequest: OrderRequest;
}

export const payOrderRequestOffersService = async ({
  orderRequestId,
  offersData,
  io,
  req,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    let orderRequest = await OrderRequest.findByPk(orderRequestId, {
      transaction,
    });
    if (['PAYMENT_POSTPONED', 'PAID', 'COMPLETED'].includes(orderRequest.status)) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Ошибка. Заказ уже оплачен',
      });
    }

    const offers = await Order.findAll({
      where: {
        orderRequestId: orderRequest.id,
        idOrder: {
          [Op.ne]: null,
        },
      },
      include: [
        {
          model: RequestProduct,
          as: 'products',
        },
      ],
    });

    for (const offerData of offersData) {
      let offerEntity = offers?.find(el => el?.id === offerData?.id);
      if (!offerEntity) continue;

      const selectedProductsPrice = offerEntity.products
        .filter(product => product.isSelected)
        .map(product => product?.count * product?.unitPrice)
        .reduce((a, b) => a + b, 0);
      let updateData: any = {
        paidSum: offerData.paidSum,
        paymentPostponeAcceptedAt: offerData?.paymentPostponeAccepted ? new Date() : null,
      };

      if (offerData?.paidSum < selectedProductsPrice && offerEntity.status !== 'PAID') {
        offerData.paidAt = null;
        offerData.status = 'OFFER';
        updateData.paidAt = null;
        updateData.status = 'OFFER';
      }
      if (offerData?.paymentPostponeAccepted) {
        offerData.status = 'PAYMENT_POSTPONED';
        updateData.status = 'PAYMENT_POSTPONED';
      }
      if (offerData?.paidSum >= selectedProductsPrice) {
        if (!offerEntity.paidAt) {
          offerData.paidAt = new Date();
          updateData.paidAt = new Date();
        }
        offerData.status = 'PAID';
        updateData.status = 'PAID';
        updateData.cancelPaymentMessage = null;
      }
      if (offerEntity.status === 'PAID') {
        updateData = {};
      }

      offerEntity = await offerEntity.update(updateData, {
        transaction,
      });

      if (['PAID', 'PAYMENT_POSTPONED'].includes(offerEntity?.status)) {
        const organization = await Organization.findByPk(offerEntity?.organizationId, { transaction });
        if (organization?.inn !== SERVICE_ORGANIZATION_INN || !offerEntity?.contractId) continue;

        await generateSpecificationService({
          orderRequestId: orderRequest.id,
          orderId: offerEntity.id,
          req,
          res,
          transaction,
        });
      }
    }

    orderRequest = await OrderRequest.findByPk(orderRequestId, {
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

    // if part of offers paid fully and other part paid partly
    if (
      offersData.filter(offer => ['PAID', 'PAYMENT_POSTPONED'].includes(offer.status)).length > 0 &&
      !offersData.filter(offer => offer.status !== 'PAID' && offer?.paidSum > 0).length
    ) {
      const deleteOfferIds = orderRequest.orders
        .filter(({ id }) => !offersData.some(el => el.id === id && ['PAID', 'PAYMENT_POSTPONED'].includes(el.status)))
        .map(({ id }) => id);
      const deleteRequestProductIds = orderRequest.orders
        .flatMap(({ products }) => products.map(({ id, isSelected }) => !isSelected && id))
        .filter(Boolean);
      const unpaidSellerIds = orderRequest.orders.filter(el => deleteOfferIds.includes(el.id)).map(el => el.sellerId);

      await Order.destroy({ where: { id: deleteOfferIds }, transaction });
      await RequestProduct.destroy({ where: { id: deleteRequestProductIds }, transaction });

      orderRequest = await orderRequest.update(
        {
          status: offersData.some(el => el?.status === 'PAYMENT_POSTPONED') ? 'PAYMENT_POSTPONED' : 'PAID',
          paymentPostponeAcceptedAt: offersData.some(el => !!el?.paymentPostponeAcceptedAt) ? new Date() : null,
          paymentDate: new Date(),
          paidSum: offersData.map(offerData => offerData.paidSum).reduce((a, b) => a + b, 0),
          unpaidSellerIds: JSON.stringify(unpaidSellerIds),
          managerLastNotificationCreatedAt: new Date(),
          cancelPaymentMessage: offersData.some(el => el?.status === 'PAYMENT_POSTPONED')
            ? orderRequest.cancelPaymentMessage
            : null,
        },
        {
          transaction,
        },
      );

      // Notifications block start
      const changedOrderRequest = await OrderRequest.findByPk(orderRequest.id, {
        include: [
          {
            model: Order,
            as: 'orders',
            where: {
              id: {
                [Op.notIn]: deleteOfferIds,
              },
            },
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
          { transaction },
        );
      }

      const sellerRole = await Role.findOne({ where: { label: 'seller' }, transaction });
      for (const offer of changedOrderRequest.orders) {
        const offerProducts = await RequestProduct.findAll({
          where: {
            orderId: offer.id,
          },
          transaction,
        });

        for (const offerProduct of offerProducts) {
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

        await PricedProductReservation.destroy({
          where: {
            offerId: offer.id,
          },
          transaction,
        });

        const notification = await Notification.findOne({
          where: {
            userId: offer.sellerId,
            roleId: sellerRole.id,
            type: ENotificationType.orderPaid,
            orderRequestId: changedOrderRequest.id,
            orderId: offer.id,
          },
          transaction,
        });
        if (!!notification) continue;

        await createOrderNotificationService({
          userId: offer.sellerId,
          role: 'seller',
          type: offer.status === 'PAID' ? ENotificationType.orderPaid : ENotificationType.orderPaymentPostponed,
          autoread: false,
          orderRequest: changedOrderRequest,
          order: offer,
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
    } else {
      orderRequest = await orderRequest.update(
        {
          paidSum: offersData.map(offerData => offerData.paidSum).reduce((a, b) => a + b, 0),
        },
        {
          transaction,
        },
      );

      await createOrderNotificationService({
        userId: orderRequest.customerId,
        role: 'customer',
        type: ENotificationType.orderPartialPayment,
        autoread: false,
        orderRequest,
        io,
        transaction,
      });
    }

    await updateOrderRequestUserStatusService({
      orderRequestId: orderRequest.id,
      transaction,
    });

    return {
      orderRequest,
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
