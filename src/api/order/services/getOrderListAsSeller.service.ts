import { Request } from 'express';
import seq, { Op } from 'sequelize';
import Address from '../../address/models/Address.model';
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
import { getMonthFilter, getPaginationParams } from '../../../utils/common.utils';
import Organization from '../../organization/models/Organization.model';

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

export const getOrderListAsSellerService = async ({ ids, req, isHistory }: IProps): Promise<IResult> => {
  const { query } = req;
  let status = req.query?.status as string | string[];
  const authUser: User = req.body.authUser;
  const authUserRole: UserRoles = req.body.authUserRole;

  const paginationParams = getPaginationParams(query);
  const options: seq.FindAndCountOptions = {
    order: [
      [{ model: Order, as: 'orders' }, 'sellerLastNotificationCreatedAt', 'DESC'],
      ['createdAt', 'DESC'],
    ],
    distinct: true,
  };
  options.include = [];

  options.where = {
    status: isHistory
      ? { [Op.or]: ['PAID', 'PAYMENT_POSTPONED', 'COMPLETED', 'DECLINED'] }
      : { [Op.or]: ['PAID', 'PAYMENT_POSTPONED'] },
  };

  if (!!ids?.length) {
    delete options.offset;
    options.where.id = ids;
  }

  const whereOrder: seq.WhereOptions = {
    [Op.and]: [
      { sellerId: authUser.id },
      { hasActiveRefundExchangeRequest: false },
      { ...getMonthFilter(+query.month, +query.year, 'receivingDate').where },
    ],
  };
  if (isHistory) {
    whereOrder[Op.and].push({
      status: 'PAID',
      [Op.or]: [{ receivingDate: { [Op.ne]: null } }, { isDeclined: true }],
    });
  } else {
    whereOrder[Op.and].push({
      [Op.or]: [
        { receivingDate: null, status: { [Op.or]: ['PAID', 'PAYMENT_POSTPONED'] } },
        { receivingDate: { [Op.ne]: null }, status: 'PAYMENT_POSTPONED' },
      ],
      isDeclined: false,
    });
  }

  if (!!status) {
    status = [].concat(status);
    whereOrder[Op.and].push({
      sellerStatus: {
        [Op.in]: status,
      },
    });
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
    where: whereOrder,
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
        model: Organization,
        as: 'organization',
        attributes: ['priceBenefitPercent'],
      },
      {
        model: Reward,
        as: 'reward',
      },
    ],
  });

  options.include.push({
    model: User,
    as: 'customer',
    required: true,
  });

  // Include delivery address
  options.include.push({
    model: Address,
    as: 'address',
    required: true,
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

  let orderRequests = await OrderRequest.findAndCountAll(options);
  if (!ids?.length) {
    orderRequests.rows = orderRequests.rows.filter(
      (__, i) => i >= paginationParams.offset && i < paginationParams.offset + paginationParams.limit,
    );
  }
  orderRequests.rows = orderRequests.rows.map(orderRequest => orderRequest.toJSON()) as OrderRequest[];

  return {
    data: {
      ...orderRequests,
      rows: orderRequests.rows.map(orderRequest => formatOrderRequestStatus(orderRequest, 'seller', authUser.id)),
    },
  };
};
