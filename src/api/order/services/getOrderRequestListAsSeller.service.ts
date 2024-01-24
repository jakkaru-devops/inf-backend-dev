import { Request } from 'express';
import seq, { Op } from 'sequelize';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import Address from '../../address/models/Address.model';
import User from '../../user/models/User.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import { formatOrderRequestStatus } from '../utils';
import UserRoles from '../../role/models/UserRoles.model';
import Notification from '../../notification/models/Notification.model';
import { ENotificationType } from '../../notification/interfaces';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import _ from 'lodash';
import OrderRequestSellerData from '../models/OrderRequestSellerData.model';
import { getPaginationParams } from '../../../utils/common.utils';
import Product from '../../catalog/models/Product.model';

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

export const getOrderRequestListAsSeller_service = async ({ ids, req }: IProps): Promise<IResult> => {
  const { query } = req;
  let status = req.query?.status as string | string[];
  const authUser: User = req.body.authUser;
  const authUserRole: UserRoles = req.body.authUserRole;

  const whereOrderRequest: any = {
    status: {
      [Op.or]: ['REQUESTED', 'APPROVED'],
    },
    [Op.or]: [
      {
        invoiceSellerIds: null,
      },
      {
        invoiceSellerIds: {
          [Op.substring]: authUser.id,
        },
      },
    ],
    customerId: {
      [Op.ne]: authUser.id,
    },
    managerDeletedAt: null,
  };
  // Where idOrder
  const idOrder = ((query.idOrder as string) || '').trim();
  if (idOrder.length > 0) {
    whereOrderRequest.idOrder = {
      [Op.iLike]: `${idOrder}%`,
    };
  }

  if (!!ids?.length) {
    whereOrderRequest.id = ids;
  }

  // Define options to get OrderRequest
  const options: seq.FindAndCountOptions = {
    ...getPaginationParams(query),
    order: [['lastNotificationCreatedAt', 'DESC']],
    distinct: true,
    where: {
      [Op.and]: [
        {
          sellerId: authUser.id,
        },
        {
          [Op.or]: [
            {
              productsNumber: {
                [Op.gt]: 0,
              },
            },
            {
              describedProductsNumber: {
                [Op.gt]: 0,
              },
            },
          ],
        },
      ],
    },
    include: [
      {
        model: OrderRequest,
        as: 'orderRequest',
        required: true,
        where: whereOrderRequest,
        include: [
          {
            model: User,
            as: 'customer',
            required: true,
          },
          {
            model: RequestProduct,
            as: 'products',
            required: false,
            include: [{ model: Product, as: 'product', attributes: ['id'], required: false }],
          },
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
          {
            model: Order,
            as: 'orders',
            where: {
              sellerId: authUser.id,
            },
            required: false,
            include: [
              {
                model: RequestProduct,
                as: 'products',
                required: false,
              },
            ],
          },
          {
            model: Address,
            as: 'address',
          },
        ],
      },
    ],
  };

  if (!!ids?.length) {
    delete options.offset;
  }

  if (!!status) {
    status = [].concat(status);
    options.where[Op.and].push({
      sellerStatus: {
        [Op.in]: status,
      },
    });
  }

  // Get order requests
  let entities = await OrderRequestSellerData.findAndCountAll(options);

  const rows: OrderRequest[] = [];
  for (const sellerData of entities.rows) {
    const orderRequest = sellerData.orderRequest;
    const requestProductEntities = await RequestProduct.findAll({
      where: {
        orderRequestId: orderRequest.id,
      },
      include: [
        {
          model: DescribedProduct,
          as: 'describedProduct',
          required: false,
        },
      ],
    });
    const productIds: string[] = JSON.parse(sellerData.productIds || '[]');
    const requestProducts: RequestProduct[] = requestProductEntities.filter(el => productIds.includes(el.productId));

    for (const requestProduct of requestProductEntities) {
      if (!!requestProduct.describedProduct) {
        requestProducts.push(requestProduct);
      }
    }

    rows.push(orderRequest.toJSON() as OrderRequest);
  }

  const orderRequests = {
    rows,
    count: entities.count,
  };

  return {
    data: {
      ...orderRequests,
      rows: orderRequests.rows.map(orderRequest => formatOrderRequestStatus(orderRequest, 'seller', authUser.id)),
    },
  };
};
