import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import Product from '../models/Product.model';
import { transformProduct } from '../utils';
import { ICreateProductOfferDto } from '../interfaces/dto';
import { APIError } from '../../../utils/api.utils';
import { simplifyHtml } from '../../../utils/common.utils';
import User from '../../user/models/User.model';
import { PRODUCT_OFFER_STATUSES, PRODUCT_STATUSES } from '../data';
import ProductOffer from '../models/ProductOffer.model';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import { createNotification } from '../../notification/services/createNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import Notification from '../../notification/models/Notification.model';
import SocketIO from 'socket.io';
import catalogService from '../catalog.service';

interface IProps {
  productOffer: ICreateProductOfferDto;
  sourceProductId?: string;
  comment?: string;
  authUser: User;
  authUserRole: UserRoles;
  io: SocketIO.Server;
  req: Request;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  productOffer: ProductOffer;
  product: Product;
}

export const createProductOfferService = async ({
  productOffer: productOfferData,
  sourceProductId,
  comment,
  authUser,
  authUserRole,
  io,
  req,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const productData = productOfferData?.product;

    // Create product
    const product = await catalogService.createProduct(
      {
        ...productData,
        status: PRODUCT_STATUSES.REVIEW,
        userId: authUser.id,
        authUserRole,
      },
      { transaction },
    );

    // Create product offer
    let productOffer = await ProductOffer.create(
      {
        sellerId: authUser.id,
        productId: product.id,
        sourceProductId: sourceProductId || null,
        status: PRODUCT_OFFER_STATUSES.REVIEW,
        comment: simplifyHtml(comment) || null,
      },
      { transaction },
    );

    const moderatorRole = await Role.findOne({
      where: {
        label: 'moderator',
      },
      transaction,
    });
    const moderators = await User.findAll({
      include: [
        {
          model: UserRoles,
          as: 'roles',
          where: {
            roleId: moderatorRole.id,
          },
        },
      ],
      transaction,
    });

    productOffer = await ProductOffer.findByPk(productOffer.id, {
      include: [
        {
          model: Product,
          as: 'product',
        },
      ],
      transaction,
    });

    await Notification.create(
      {
        userId: authUser.id,
        roleId: authUserRole.roleId,
        data: {},
        type: ENotificationType.dummy,
        autoread: false,
        productOfferId: productOffer.id,
        viewedAt: new Date(),
      },
      {
        transaction,
      },
    );

    for (const moderator of moderators) {
      await createNotification({
        userId: moderator.id,
        role: 'moderator',
        type: ENotificationType.productOfferCreated,
        autoread: false,
        productOfferId: productOffer.id,
        data: {
          productOffer: {
            id: productOffer.id,
            productName: transformProduct(productOffer.product).name,
          },
        },
        io,
        res,
        transaction,
      });
    }

    return {
      productOffer,
      product,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при отправке оцифрованного товара на рассмотрение',
      error: err,
    });
  }
};
