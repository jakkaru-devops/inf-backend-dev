import httpStatus from 'http-status';
import { Transaction, Op } from 'sequelize';
import { ENotificationType } from '../../notification/interfaces';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import Notification from '../../notification/models/Notification.model';
import { formatOrderRequestStatus } from '../utils';
import OrderRequestSellerData from '../models/OrderRequestSellerData.model';
import RefundExchangeRequest from '../models/RefundExchangeRequest.model';
import Reward from '../models/Reward.model';
import { ServiceError } from '../../../core/utils/serviceError';

interface IProps {
  orderRequestId: string;
  sellerIds?: string[];
  transaction?: Transaction;
}

interface IResult {
  orderRequest: OrderRequest;
}

export const updateOrderRequestUserStatusService = async ({
  orderRequestId,
  sellerIds,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    let orderRequest = await OrderRequest.findOne({
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
              required: false,
              attributes: ['id', 'isSelected'],
            },
            {
              model: RefundExchangeRequest,
              as: 'refundExchangeRequests',
              required: false,
            },
            {
              model: Reward,
              as: 'reward',
              required: false,
            },
          ],
        },
        {
          model: Notification,
          as: 'notifications',
          where: {
            type: {
              [Op.ne]: ENotificationType.dummy,
            },
          },
          required: false,
        },
      ],
      transaction,
    });
    orderRequest = orderRequest.toJSON() as OrderRequest;

    const sellersData = await OrderRequestSellerData.findAll({
      where: {
        orderRequestId: orderRequest.id,
      },
      transaction,
    });

    const requestProducts = await RequestProduct.findAll({
      where: {
        orderRequestId: orderRequest.id,
      },
      attributes: ['id', 'describedProductId'],
      transaction,
    });
    orderRequest.products = requestProducts.map(el => el.toJSON() as RequestProduct);

    const updateParams = {
      customerStatus: formatOrderRequestStatus(orderRequest, 'customer')?.status,
      managerStatus: formatOrderRequestStatus(orderRequest, 'employee')?.status,
    };

    await OrderRequest.update(updateParams, {
      where: {
        id: orderRequest.id,
      },
      transaction,
    });

    sellerIds = (sellerIds || []).filter(Boolean);
    if (!sellerIds?.length) {
      sellerIds = sellersData.map(el => el.sellerId);
    }
    for (const sellerId of sellerIds) {
      const sellerStatus = formatOrderRequestStatus(orderRequest, 'seller', sellerId)?.status;
      await OrderRequestSellerData.update(
        {
          sellerStatus,
        },
        {
          where: {
            orderRequestId,
            sellerId,
          },
          transaction,
        },
      );
      await Order.update(
        {
          sellerStatus,
        },
        {
          where: {
            orderRequestId,
            sellerId,
          },
          transaction,
        },
      );
    }

    return {
      orderRequest,
    };
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при обновлении статуса заказа',
      error: err,
    });
  }
};
