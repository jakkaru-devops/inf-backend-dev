import { Request } from 'express';
import seq, { Op } from 'sequelize';
import Address from '../../address/models/Address.model';
import Product from '../../catalog/models/Product.model';
import User from '../../user/models/User.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import { formatOrderRequestStatus } from '../utils';
import UserRoles from '../../role/models/UserRoles.model';
import Notification from '../../notification/models/Notification.model';
import { ENotificationType } from '../../notification/interfaces';
import { getPaginationParams } from '../../../utils/common.utils';
import ordersService from '../orders.service';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';

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

export const getOrderRequestListAsManager_service = async ({ ids, req }: IProps): Promise<IResult> => {
  const { query } = req;
  let status = req.query?.status as string | string[];
  const authUser: User = req.body.authUser;
  const authUserRole: UserRoles = req.body.authUserRole;

  const options: seq.FindAndCountOptions = {
    ...getPaginationParams(query, 10),
    order: [['managerLastNotificationCreatedAt', 'DESC']],
    distinct: true,
  };
  options.include = [];
  options.where = {};

  if (authUserRole.role?.label !== 'manager') {
    options.where['managerDeletedAt'] = null;
  }

  if (!!ids?.length) {
    delete options.offset;
    options.where.id = ids;
  }

  // Where status
  options.where.status = {
    [Op.or]: ['REQUESTED', 'APPROVED'],
  };

  if (!!status) {
    status = [].concat(status);
    options.where.managerStatus = {
      [Op.in]: status,
    };
  }

  // Where customer is not the same seller
  options.where.customerId = {
    [Op.ne]: authUser.id,
  };

  // Where idOrder
  const idOrder = ((query.idOrder as string) || '').trim();
  if (idOrder.length > 0) {
    options.where.idOrder = {
      [Op.iLike]: `${idOrder}%`,
    };
  }

  // Include orders (offers)
  options.include.push({
    model: Order,
    as: 'orders',
    required: false,
  });

  // Include products
  options.include.push({
    model: RequestProduct,
    as: 'products',
    required: false,
    include: [
      { model: Product, as: 'product', attributes: ['id'], required: false },
      { model: DescribedProduct, as: 'describedProduct', attributes: ['id'], required: false },
    ],
  });

  // Include delivery address
  options.include.push({
    model: Address,
    as: 'address',
    required: true,
  });

  options.include.push({
    model: Notification,
    as: 'notifications',
    where: {
      type: {
        [Op.ne]: ENotificationType.dummy,
      },
    },
    required: false,
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
  orderRequests.rows = orderRequests.rows.map(orderRequest => orderRequest.toJSON()) as OrderRequest[];

  for (const request of orderRequests.rows) {
    request.categories = await ordersService.getAllOrderCategories({ order: request });
  }

  return {
    data: {
      ...orderRequests,
      rows: orderRequests.rows.map(orderRequest => formatOrderRequestStatus(orderRequest, 'employee')),
    },
  };
};
