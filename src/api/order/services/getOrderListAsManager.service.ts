import { getMonthFilter, getPaginationParams } from './../../../utils/common.utils';
import { Request } from 'express';
import seq, { Op } from 'sequelize';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import Address from '../../address/models/Address.model';
import Product from '../../catalog/models/Product.model';
import RefundExchangeRequest from '../models/RefundExchangeRequest.model';
import User from '../../user/models/User.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import Reward from '../models/Reward.model';
import { formatOrderRequestStatus } from '../utils';
import UserRoles from '../../role/models/UserRoles.model';
import Notification from '../../notification/models/Notification.model';
import { ENotificationType } from '../../notification/interfaces';

interface IProps {
  ids?: string[];
  req: Request;
  isHistory: boolean;
}

interface IResult {
  data: {
    count: number;
    rows: OrderRequest[];
  };
}

export const getOrderListAsManagerService = async ({ ids, req, isHistory }: IProps): Promise<IResult> => {
  const { query } = req;
  let status = req.query?.status as string | string[];
  let customerStatus = req.query?.customerStatus as string | string[];
  let sellerStatus = req.query?.sellerStatus as string | string[];
  const authUser: User = req.body.authUser;
  const authUserRole: UserRoles = req.body.authUserRole;

  const whereOrders: any = {};
  const options: seq.FindAndCountOptions = {
    ...getPaginationParams(query, 10),
    order: [['managerLastNotificationCreatedAt', 'DESC']],
    distinct: true,
  };
  options.include = [];

  // Where status
  options.where = {
    status: isHistory ? { [Op.or]: ['COMPLETED', 'DECLINED'] } : ['PAID', 'PAYMENT_POSTPONED'],
    hasActiveRefundExchangeRequest: false,
    ...getMonthFilter(+query.month, +query.year, 'completionDate').where,
  };

  if (!!ids?.length) {
    delete options.offset;
    options.where.id = ids;
  }

  if (!!status) {
    status = [].concat(status);
    options.where.managerStatus = {
      [Op.in]: status,
    };
  }
  if (!!customerStatus) {
    customerStatus = [].concat(customerStatus);
    options.where.customerStatus = {
      [Op.in]: customerStatus,
    };
  }
  if (!!sellerStatus) {
    sellerStatus = [].concat(sellerStatus);
    whereOrders.sellerStatus = {
      [Op.in]: sellerStatus,
    };
  }

  // Where idOrder
  const idOrder = ((query.idOrder as string) || '').trim();
  if (idOrder.length > 0) {
    options.where.idOrder = {
      [Op.iLike]: `${idOrder}%`,
    };
  }

  // Include sellers orders (offers accepted by customer)
  options.include.push({
    model: Order,
    as: 'orders',
    required: true,
    where: whereOrders,
    include: [
      {
        model: RequestProduct,
        as: 'products',
        required: false,
        include: [
          {
            model: RefundExchangeRequest,
            as: 'refundExchangeRequest',
            required: false,
          },
        ],
      },
      {
        model: User,
        as: 'seller',
        required: false,
      },
      {
        model: Reward,
        as: 'reward',
      },
    ],
  });

  // // Include products
  // options.include.push({
  //   model: RequestProduct,
  //   as: 'products',
  //   required: true,
  // });

  /* // Include notifications
  options.include.push({
    model: Notification,
    as: 'notifications',
    where: {
      userId: authUser.id,
      roleId: authUserRole.roleId,
      // type: {
      //   [Op.ne]: ENotificationType.dummy,
      // },
    },
    required: false,
  }); */

  options.include.push({
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
  });

  // Include delivery address
  options.include.push({
    model: Address,
    as: 'address',
    required: true,
  });

  let orderRequests = await OrderRequest.findAndCountAll(options);
  orderRequests.rows = orderRequests.rows.map(orderRequest => orderRequest.toJSON()) as OrderRequest[];

  for (const order of orderRequests.rows) {
    if (
      (['PAID', 'PAYMENT_POSTPONED', 'COMPLETED', 'DECLINED'] as Array<OrderRequest['status']>).includes(order.status)
    ) {
      order.orders = order.orders.filter(offer =>
        (['PAID', 'PAYMENT_POSTPONED'] as Array<Order['status']>).includes(offer.status),
      );
    }
  }

  return {
    data: {
      ...orderRequests,
      rows: orderRequests.rows.map(orderRequest => formatOrderRequestStatus(orderRequest, 'employee')),
    },
  };
};
