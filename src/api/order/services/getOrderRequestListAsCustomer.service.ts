import { Request } from 'express';
import seq, { Op } from 'sequelize';
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
import Product from '../../catalog/models/Product.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import ordersService from '../orders.service';

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

export const getOrderRequestListAsCustomer_service = async ({ ids, req }: IProps): Promise<IResult> => {
  const { query } = req;
  let status = req.query?.status as string | string[];
  let sortOrder = (req.query?.order as string)?.toUpperCase() as 'ASC' | 'DESC';
  const authUser: User = req.body.authUser;
  const authUserRole: UserRoles = req.body.authUserRole;

  if (!['ASC', 'DESC'].includes(sortOrder)) {
    sortOrder = 'DESC';
  }

  const options: seq.FindAndCountOptions = {
    ...getPaginationParams(query, 10),
    order: [['customerLastNotificationCreatedAt', sortOrder]],
    distinct: true,
  };

  options.where = {
    [Op.and]: [],
  };
  options.include = [];

  options.where['managerDeletedAt'] = null;

  if (!!ids?.length) {
    delete options.offset;
    options.where[Op.and].push({
      id: ids,
    });
  }

  // Where customer is auth auth
  options.where[Op.and].push({
    customerId: authUser.id,
  });

  // Where status
  options.where[Op.and].push({
    status: {
      [Op.or]: ['REQUESTED', 'APPROVED'],
    },
  });

  if (!!status) {
    status = [].concat(status);
    options.where[Op.and].push({
      customerStatus: {
        [Op.in]: status,
      },
    });
  }

  // Where idOrder
  const idOrder = ((query.idOrder as string) || '').trim();
  if (idOrder.length > 0) {
    options.where[Op.and].push({
      idOrder: {
        [Op.iLike]: `${idOrder}%`,
      },
    });
  }

  // Include orders (offers)
  options.include.push({
    model: Order,
    as: 'orders',
    required: false,
  });

  options.include.push({
    model: Notification,
    as: 'notifications',
    where: {
      userId: authUser.id,
      roleId: authUserRole.roleId,
      type: {
        [Op.ne]: ENotificationType.dummy,
      },
    },
    required: false,
    separate: true,
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

  let orderRequests = await OrderRequest.findAndCountAll(options);
  orderRequests.rows = orderRequests.rows.map(orderRequest => orderRequest.toJSON()) as OrderRequest[];

  for (const request of orderRequests.rows) {
    request.categories = await ordersService.getAllOrderCategories({ order: request });
  }

  return {
    data: {
      ...orderRequests,
      rows: orderRequests.rows.map(orderRequest => formatOrderRequestStatus(orderRequest, 'customer')),
    },
  };
};
