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

export const getRefundExchangeListAsCustomerService = async ({ ids, req }: IProps): Promise<IResult> => {
  const { query } = req;
  let status = req.query?.status as string | string[];
  const authUser: User = req.body.authUser;
  const authUserRole: UserRoles = req.body.authUserRole;

  const options: seq.FindAndCountOptions = {
    ...getPaginationParams(query, 10),
    order: [['customerLastNotificationCreatedAt', 'DESC']],
    distinct: true,
    include: [
      {
        model: Order,
        as: 'orders',
        separate: true,
        include: [
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
          },
        ],
      },
    ],
  };

  options.where = {
    customerId: authUser.id,
    hasActiveRefundExchangeRequest: true,
  };

  if (!!ids?.length) {
    delete options.offset;
    options.where.id = ids;
  }

  // Where idOrder
  const idOrder = ((query.idOrder as string) || '').trim();
  if (idOrder.length > 0) {
    options.where.idOrder = {
      [Op.iLike]: `${idOrder}%`,
    };
  }
  if (!!status) {
    status = [].concat(status);
    options.where.customerStatus = {
      [Op.in]: status,
    };
  }

  const orderRequests = await OrderRequest.findAndCountAll(options);
  orderRequests.rows = orderRequests.rows.map(el => el.toJSON() as OrderRequest);

  if (!!orderRequests?.rows?.length) {
    const unreadNotifications = await Notification.findAll({
      where: {
        orderId: orderRequests.rows.flatMap(({ orders }) => orders.map(el => el.id)),
        userId: authUser.id,
        roleId: authUserRole.roleId,
        viewedAt: null,
        type: {
          [Op.ne]: ENotificationType.dummy,
        },
      },
    });
    for (let i = 0; i < orderRequests?.rows?.length; i++) {
      const orderRequest = orderRequests.rows[i];
      const orderIds = orderRequest.orders.map(el => el.id);
      orderRequests.rows[i].unreadNotifications = unreadNotifications
        .filter(el => el?.orderRequestId === orderRequest.id || orderIds?.includes(el?.orderId))
        .map(el => el.toJSON() as Notification);
    }
  }

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
