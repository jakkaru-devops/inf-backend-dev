import { Request } from 'express';
import seq, { Op } from 'sequelize';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import { getPaginationParams } from '../../../utils/common.utils';
import Address from '../../address/models/Address.model';
import User from '../../user/models/User.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import Notification from '../../notification/models/Notification.model';
import { formatOrderRequestStatus } from '../utils';
import UserRoles from '../../role/models/UserRoles.model';
import { ENotificationType } from '../../notification/interfaces';
import RefundExchangeRequest from '../models/RefundExchangeRequest.model';
import Reward from '../models/Reward.model';

interface IProps {
  ids?: string[];
  req: Request;
}

interface IResult {
  data: {
    count: number;
    rows: OrderRequest[];
  };
}

export const getRefundExchangeListAsSellerService = async ({ ids, req }: IProps): Promise<IResult> => {
  const { query } = req;
  let status = req.query?.status as string | string[];
  const authUser: User = req.body.authUser;
  const authUserRole: UserRoles = req.body.authUserRole;

  const whereOrderRequest: any = {
    hasActiveRefundExchangeRequest: true,
  };
  const whereOrder: any = {
    sellerId: authUser.id,
    hasActiveRefundExchangeRequest: true,
  };
  // Where idOrder
  const idOrder = ((query.idOrder as string) || '').trim();
  if (idOrder.length > 0) {
    whereOrderRequest.idOrder = {
      [Op.iLike]: `${idOrder}%`,
    };
  }
  if (!!status) {
    status = [].concat(status);
    whereOrder.sellerStatus = {
      [Op.in]: status,
    };
  }

  const paginationParams = getPaginationParams(query, 10);

  if (!!ids?.length) {
    delete paginationParams.offset;
    whereOrderRequest.id = ids;
  }

  const options: seq.FindAndCountOptions = {
    ...paginationParams,
    order: [['sellerLastNotificationCreatedAt', 'DESC']],
    distinct: true,
    where: whereOrder,
    include: [
      {
        model: OrderRequest,
        as: 'orderRequest',
        required: true,
        where: whereOrderRequest,
        include: [
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: false,
          },
        ],
      },
      {
        model: RequestProduct,
        as: 'products',
        required: true,
        include: [
          {
            model: RefundExchangeRequest,
            as: 'refundExchangeRequest',
          },
        ],
      },
      {
        model: RefundExchangeRequest,
        as: 'refundExchangeRequests',
        separate: true,
      },
      {
        model: Reward,
        as: 'reward',
      },
    ],
  };

  const orders = await Order.findAndCountAll(options);
  const orderRequests = {
    count: orders.count,
    rows: orders.rows
      .map(order => order.toJSON() as Order)
      .map(
        order =>
          ({
            ...order.orderRequest,
            orders: [order],
          } as OrderRequest),
      ),
  };

  // options.include.push({
  //   model: RequestProduct,
  //   as: 'products',
  //   required: true,
  //   separate: true,
  // });

  orderRequests.rows = orderRequests.rows
    .filter(({ orders }) =>
      orders.some(({ products }) => products.some(({ refundExchangeRequest }) => refundExchangeRequest)),
    )
    .map(orderRequest =>
      formatOrderRequestStatus(
        orderRequest,
        authUserRole.role.label as any,
        authUserRole.role.label === 'seller' && authUser.id,
      ),
    );

  return {
    data: orderRequests,
  };
};
