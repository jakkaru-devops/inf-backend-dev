import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Transaction, Sequelize, Op } from 'sequelize';
import SocketIO from 'socket.io';
import { APIError } from '../../../utils/api.utils';
import { gaussRound, round } from '../../../utils/common.utils';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import CartProduct from '../../cart/models/CartProduct.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import DescribedProductFile from '../../catalog/models/DescribedProductFile.model';
import FileModel from '../../files/models/File.model';
import { ENotificationType } from '../../notification/interfaces';
import Notification from '../../notification/models/Notification.model';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';
import Organization from '../../organization/models/Organization.model';
import { setSelectedRegionsSettlements } from '../../regions/services/setSelectedRegionsSettlements';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';
import { IRequestProduct } from '../interfaces';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import RefundExchangeRequest from '../models/RefundExchangeRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import Reward from '../models/Reward.model';
import { calculateOrderCash } from '../utils';
import { getSellersByOrderRequestService } from './getSellersByOrderRequest.service';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';

interface IProps {
  id: string;
  reply: string;
  io: SocketIO.Server;
  req: Request;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  refundExchangeRequest: RefundExchangeRequest;
}

export const updateRefundExchangeRequestService = async ({
  id,
  reply,
  io,
  req,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const { query } = req;
    const authUserRole: UserRoles = req.body.authUserRole;

    const refundExchangeRequest = await RefundExchangeRequest.findByPk(id, {
      include: [
        {
          model: RequestProduct,
          as: 'requestProduct',
          required: true,
          include: [{ model: Order, as: 'order', include: [{ model: OrderRequest, as: 'orderRequest' }] }],
        },
      ],
      transaction,
    });
    const status = refundExchangeRequest.status;

    const updatedParams: {
      status?: 'AGREED' | 'RESOLVED' | 'CLOSED';
      isRejected?: boolean;
      reply?: string;
    } = {};

    if (authUserRole.role.label === 'seller') {
      updatedParams['status'] = 'AGREED';
      updatedParams['isRejected'] = !!query.reject;
      updatedParams['reply'] = reply || null;
    }

    if (authUserRole.role.label === 'customer') updatedParams['status'] = 'CLOSED';

    if (['manager', 'operator'].includes(authUserRole?.role?.label)) updatedParams['status'] = 'CLOSED';

    const updatedRefundExchangeRequest = await refundExchangeRequest.update(updatedParams, {
      transaction,
    });

    //notification to customer
    if (updatedParams['status'] === 'AGREED') {
      let notificationType: ENotificationType;

      if (refundExchangeRequest.disputeResolution === 'REFUND') {
        notificationType = updatedRefundExchangeRequest.isRejected
          ? ENotificationType.refundProductDecline
          : ENotificationType.refundProductAccept;
      }
      if (refundExchangeRequest.disputeResolution === 'EXCHANGE') {
        notificationType = updatedRefundExchangeRequest.isRejected
          ? ENotificationType.exchangeProductDecline
          : ENotificationType.exchangeProductAccept;
      }

      await createOrderNotificationService({
        userId: refundExchangeRequest.customerId,
        role: 'customer',
        type: notificationType,
        autoread: false,
        orderRequest: refundExchangeRequest.requestProduct.order.orderRequest,
        order: refundExchangeRequest.requestProduct.order,
        io,
        transaction,
      });

      await createOrderNotificationForAllManagersService({
        type: notificationType,
        autoread: false,
        orderRequest: refundExchangeRequest.requestProduct.order.orderRequest,
        order: refundExchangeRequest.requestProduct.order,
        io,
        res,
        transaction,
      });
    }

    if (updatedParams['status'] === 'CLOSED') {
      const requestProduct = await RequestProduct.findByPk(refundExchangeRequest.requestProductId, {
        transaction,
      });
      const updateOrderParams: any = {};

      if (
        refundExchangeRequest.disputeResolution === 'REFUND' &&
        status === 'AGREED' &&
        !refundExchangeRequest.isRejected
      ) {
        await requestProduct.update(
          {
            count: Math.max(requestProduct.count - refundExchangeRequest.quantity, 0),
          },
          {
            transaction,
          },
        );

        const order = await Order.findByPk(requestProduct.orderId, {
          include: [
            {
              model: RequestProduct,
              as: 'products',
            },
            {
              model: Organization,
              as: 'organization',
              required: true,
            },
          ],
          transaction,
        });

        const totalPrice = order.products
          .map(({ unitPrice, count }) => unitPrice * count)
          .filter(Boolean)
          .reduce((a, b) => a + b, 0);

        updateOrderParams.totalPrice = totalPrice;

        await order.update(
          {
            totalPrice,
          },
          { transaction },
        );

        const org = order.organization;

        const reward = await Reward.findOne({
          where: {
            orderId: requestProduct.orderId,
          },
          transaction,
        });
        if (!!reward) {
          await reward.update(
            {
              amount:
                !!org?.priceBenefitPercentAcquiring && !!org?.priceBenefitPercentInvoice
                  ? 0
                  : gaussRound(calculateOrderCash(totalPrice, order.organization.priceBenefitPercent, true), 2),
            },
            { transaction },
          );
        }
      }

      //notification to seller
      if (status === 'AGREED' && authUserRole.role.label === 'customer') {
        let notificationType =
          refundExchangeRequest.disputeResolution === 'REFUND'
            ? ENotificationType.refundProductComplete
            : ENotificationType.exchangeProductComplete;

        await createOrderNotificationService({
          userId: refundExchangeRequest.requestProduct.order.sellerId,
          role: 'seller',
          type: notificationType,
          autoread: false,
          orderRequest: refundExchangeRequest.requestProduct.order.orderRequest,
          order: refundExchangeRequest.requestProduct.order,
          io,
          transaction,
        });

        await createOrderNotificationForAllManagersService({
          type: notificationType,
          autoread: false,
          orderRequest: refundExchangeRequest.requestProduct.order.orderRequest,
          order: refundExchangeRequest.requestProduct.order,
          io,
          res,
          transaction,
        });
      }

      const order = await Order.findByPk(requestProduct.orderId, {
        include: [
          {
            model: RequestProduct,
            as: 'products',
            include: [
              {
                model: RefundExchangeRequest,
                as: 'refundExchangeRequests',
                required: false,
              },
            ],
          },
          {
            model: Organization,
            as: 'organization',
            required: true,
          },
        ],
        transaction,
      });

      updateOrderParams.hasActiveRefundExchangeRequest = order.products.some(product =>
        product?.refundExchangeRequests?.some(({ status }) => status !== 'CLOSED'),
      );

      await order.update(updateOrderParams, {
        transaction,
      });
      const orderRequest = await OrderRequest.findByPk(refundExchangeRequest.requestProduct.order.orderRequestId, {
        include: [
          {
            model: Order,
            as: 'orders',
            required: true,
            include: [{ model: RequestProduct, as: 'products' }],
          },
        ],
        transaction,
      });
      const orderRequestUpdateData: any = {
        hasActiveRefundExchangeRequest: orderRequest.orders.some(order => order.hasActiveRefundExchangeRequest),
      };
      const emptyOrders = orderRequest.orders.filter(
        ({ products }) => products.map(({ count }) => count).reduce((a, b) => a + b, 0) <= 0,
      );
      if (!!emptyOrders.length) {
        await Order.update(
          {
            isDeclined: true,
          },
          {
            where: {
              id: emptyOrders.map(el => el.id),
            },
            transaction,
          },
        );
      }
      if (emptyOrders.length === orderRequest.orders.length) {
        orderRequestUpdateData.status = 'DECLINED';
        orderRequestUpdateData.completionDate = new Date();
      }
      await orderRequest.update(orderRequestUpdateData, {
        transaction,
      });
    }

    const order = refundExchangeRequest?.requestProduct?.order;
    await updateOrderRequestUserStatusService({
      orderRequestId: order?.orderRequest.id,
      sellerIds: [order?.sellerId],
      transaction,
    });

    return {
      refundExchangeRequest: updatedRefundExchangeRequest,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при обновлении заявки на возврат/обмен',
      error: err,
    });
  }
};
