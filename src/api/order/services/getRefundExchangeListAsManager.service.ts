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

export const getRefundExchangeListAsManagerService = async ({ ids, req }: IProps): Promise<IResult> => {
  const { query } = req;
  let status = req.query?.status as string | string[];
  const authUser: User = req.body.authUser;
  const authUserRole: UserRoles = req.body.authUserRole;

  const options: seq.FindAndCountOptions = {
    ...getPaginationParams(query, 10),
    order: [['managerLastNotificationCreatedAt', 'DESC']],
  };

  options.where = {
    status: {
      [Op.or]: ['PAID', 'DECLINED', 'COMPLETED'],
    },
    hasActiveRefundExchangeRequest: true,
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

  // Where idOrder
  const idOrder = ((query.idOrder as string) || '').trim();
  if (idOrder.length > 0) {
    options.where.idOrder = {
      [Op.iLike]: `${idOrder}%`,
    };
  }

  options.include = [];

  options.include.push({
    model: Order,
    as: 'orders',
    separate: true,
    include: [
      {
        model: RequestProduct,
        as: 'products',
        required: true,
        separate: true,
        include: [
          {
            model: RefundExchangeRequest,
            as: 'refundExchangeRequest',
          },
        ],
      },
      {
        model: Reward,
        as: 'reward',
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

  options.include.push({
    model: RequestProduct,
    as: 'products',
    required: true,
    separate: true,
  });

  const orderRequests = await OrderRequest.findAndCountAll(options);

  orderRequests.rows = orderRequests.rows.map(orderRequest => formatOrderRequestStatus(orderRequest, 'employee'));

  return {
    data: orderRequests,
  };
};
