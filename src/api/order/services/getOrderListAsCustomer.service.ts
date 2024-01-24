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
import Notification from '../../notification/models/Notification.model';
import UserRoles from '../../role/models/UserRoles.model';
import { ENotificationType } from '../../notification/interfaces';
import { getMonthFilter, getPaginationParams } from '../../../utils/common.utils';

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

export const getOrderListAsCustomerService = async ({ ids, req, isHistory }: IProps): Promise<IResult> => {
  const { query } = req;
  let status = req.query?.status as string | string[];
  const authUser: User = req.body.authUser;
  const authUserRole: UserRoles = req.body.authUserRole;

  const options: seq.FindAndCountOptions = {
    ...getPaginationParams(query),
    order: [['customerLastNotificationCreatedAt', 'DESC']],
    distinct: true,
  };
  options.include = [];

  // Where status
  options.where = {
    status: isHistory ? { [Op.or]: ['COMPLETED', 'DECLINED'] } : ['PAID', 'PAYMENT_POSTPONED'],
    customerId: authUser.id,
    hasActiveRefundExchangeRequest: false,
    ...getMonthFilter(+query.month, +query.year, 'completionDate').where,
  };

  if (!!status) {
    status = [].concat(status);
    options.where.customerStatus = {
      [Op.in]: status,
    };
  }

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

  // Include sellers orders (offers accepted by customer)
  options.include.push({
    model: Order,
    as: 'orders',
    required: false,
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
    ],
  });

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

  return {
    data: {
      ...orderRequests,
      rows: orderRequests.rows.map(orderRequest => formatOrderRequestStatus(orderRequest, 'customer')),
    },
  };
};
