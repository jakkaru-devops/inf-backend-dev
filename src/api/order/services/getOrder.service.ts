import { Request, Response } from 'express';
import User from '../../user/models/User.model';
import httpStatus from 'http-status';
import seq, { Op } from 'sequelize';
import Address from '../../address/models/Address.model';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import Product from '../../catalog/models/Product.model';
import { APIError } from '../../../utils/api.utils';
import UserRoles from '../../role/models/UserRoles.model';
import FileModel from '../../files/models/File.model';
import Order from '../models/Order.model';
import Organization from '../../organization/models/Organization.model';
import TransportCompany from '../../shipping/models/TransportCompany';
import UserReview from '../../user/models/UserReview.model';
import RequestProduct from '../models/RequestProduct.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import RefundExchangeRequest from '../models/RefundExchangeRequest.model';
import RefundExchangeRequestFile from '../models/RefundExchangeRequestFile.model';
import Reward from '../models/Reward.model';
import { simplifyUser } from '../../user/utils';

interface IProps {
  orderId: string;
  req: Request;
  res: Response;
}

interface IResult {
  order: Order;
}

export const getOrderService = async ({ orderId, req, res }: IProps): Promise<IResult> => {
  try {
    const authUser: User = req.body.authUser;
    const authUserRole: UserRoles = req.body.authUserRole;
    const options: seq.FindAndCountOptions = {};

    options.where = {
      id: orderId,
    };

    options.include = [];

    options.include.push(
      {
        model: Organization,
        as: 'organization',
        required: true,
        include: [{ model: Address, as: 'actualAddress' }],
      },
      {
        model: User,
        as: 'seller',
        include: [
          {
            model: TransportCompany,
            as: 'transportCompanies',
            // separate: true,
          },
          {
            model: UserReview,
            as: 'reviews',
            // separate: true,
            required: false,
          },
        ],
      },
      {
        model: RequestProduct,
        as: 'products',
        required: true,
        // separate: true,
        order: [['product', 'name_ru', 'ASC']],
        include: [
          {
            model: Product,
            as: 'product',
            required: false,
          },
          {
            model: DescribedProduct,
            as: 'describedProduct',
            required: false,
          },
          {
            model: AutoBrand, // TODO: delete or leave
            as: 'autoBrand',
            required: false,
          },
          {
            model: RefundExchangeRequest,
            as: 'refundExchangeRequest',
            include: [
              {
                model: RequestProduct,
                as: 'requestProduct',
                required: true,
                include: [
                  {
                    model: Product,
                    as: 'product',
                    required: false,
                    attributes: ['id', 'article', 'manufacturer', ['name_ru', 'name']],
                  },
                ],
              },
              {
                model: RefundExchangeRequestFile,
                as: 'refundExchangeRequestFiles',
                // separate: true,
                include: [{ model: FileModel, as: 'file' }],
              },
            ],
          },
        ],
      },
      {
        model: TransportCompany,
        as: 'transportCompany',
        required: false,
      },
      {
        model: TransportCompany,
        as: 'notConfirmedTransportCompany',
        required: false,
      },
      {
        model: Reward,
        as: 'reward',
        required: false,
      },
    );

    const order = await Order.findOne(options);
    order.seller = simplifyUser(order.seller) as any;

    if (!order) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Запрос с id ' + orderId + ' пользователя с id ' + authUser.id + ' не найден',
      });
    }

    return {
      order,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при загрузке заказа',
      error: err,
    });
  }
};
