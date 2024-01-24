import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import { stripString, transformEntityLocale } from '../../../utils/common.utils';
import Address from '../../address/models/Address.model';
import { ENotificationType } from '../../notification/interfaces';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import Organization from '../../organization/models/Organization.model';
import OrganizationBranch from '../../organization/models/OrganizationBranch.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';
import { IRequestProduct } from '../interfaces';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import { validateOrderData } from '../utils';
import addDate from 'date-fns/add';
import { RENEWAL_TIME } from '../../../config/env';
import { getOrgName } from '../../organization/utils';
import Product from '../../catalog/models/Product.model';
import { createProductOfferService } from '../../catalog/services/createProductOffer.service';
import OrderRequestSellerData from '../models/OrderRequestSellerData.model';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';
import { PRODUCT_STATUSES } from '../../catalog/data';
import ProductFile from '../../catalog/models/ProductFile.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';
import { SocketServer } from '../../../core/socket';
import * as geolib from 'geolib';
import NodeGeocoder from 'node-geocoder';

interface IProps {
  organizationId: string;
  requestProducts: IRequestProduct[];
  paymentPostponedAt: Date;
  io: SocketServer;
  req: Request;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  orderRequest: OrderRequest;
}

export const createOfferService = async ({
  organizationId,
  requestProducts,
  paymentPostponedAt,
  io,
  req,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const { query } = req;
    const authUser: User = req.body.authUser;
    const authUserRole: UserRoles = req.body.authUserRole;

    await validateOrderData({ organizationId, products: requestProducts });

    const existingOffer = await Order.findOne({
      where: {
        sellerId: authUser.id,
        orderRequestId: query.orderRequestId,
      },
      transaction,
    });

    if (!!existingOffer)
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'Ошибка. Вы уже отправили предложение на этот запрос',
      });

    const totalPrice = requestProducts
      .map(
        ({ quantity, requestedQuantity, deliveryQuantity, unitPrice }) =>
          Math.min(requestedQuantity, (quantity || 0) + (deliveryQuantity || 0)) * unitPrice,
      )
      .reduce((a, b) => a + b, 0);

    const org = await Organization.findByPk(organizationId);
    const orgBranch = await OrganizationBranch.findOne({
      where: {
        organizationId,
      },
      include: [
        {
          model: OrganizationSeller,
          as: 'sellers',
          required: true,
          where: {
            userId: authUser.id,
          },
        },
        {
          model: Address,
          required: true,
          as: 'actualAddress',
        },
      ],
    });
    const orgSeller = orgBranch.sellers[0];
    if (!!orgSeller.detachedAt) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: `Вы откреплены от организации ${getOrgName(org, true, true)}`,
      });
    }

    const supplierAddress = orgBranch.actualAddress;
    const offer = await Order.create(
      {
        orderRequestId: query.orderRequestId,
        sellerId: authUser.id,
        organizationId,
        organizationSellerId: orgSeller.id,
        supplierAddressId: supplierAddress.id,
        totalPrice,
        offerExpiresAt: addDate(new Date(), RENEWAL_TIME),
        regionFiasId: supplierAddress.regionFiasId,
        status: 'OFFER',
        sellerStatus: 'OFFER_SENT',
        paymentPostponedAt,
      },
      {
        transaction,
      },
    );

    for (const requestProductData of requestProducts) {
      if (!!requestProductData?.newProduct) {
        const newProduct = requestProductData?.newProduct;

        const { product } = await createProductOfferService({
          productOffer: {
            product: {
              ...newProduct,
              width: null,
              weight: null,
              length: null,
              height: null,
              files: [],
              status: PRODUCT_STATUSES.REVIEW,
              branches: [
                {
                  isMain: true,
                  tag: newProduct?.name,
                  description: null,
                  manufacturer: null,
                  autoTypeId: null,
                  autoBrandId: null,
                  autoModelIds: null,
                  groupId: null,
                  subgroupId: null,
                },
              ],
            },
          },
          authUser,
          authUserRole,
          io,
          req,
          res,
          transaction,
        });

        requestProductData.productId = product.id;
      } else {
        const { altName, altManufacturer, altArticle } = requestProductData;
        if (!!altManufacturer || !!altArticle) {
          let product = await Product.findOne({
            where: {
              id: requestProductData.productId,
            },
            include: [
              {
                model: ProductFile,
                as: 'productFiles',
                required: false,
                separate: true,
              },
              {
                model: ProductBranch,
                as: 'branches',
                separate: true,
              },
            ],
            transaction,
          });
          product = transformEntityLocale(product);

          await createProductOfferService({
            productOffer: {
              comment: null,
              product: {
                ...product,
                name: stripString(altName) || (product as any)?.name,
                article: stripString(altArticle) || product.article,
                manufacturer: stripString(altManufacturer) || product?.manufacturer,
                files: product.productFiles.map(el => ({
                  id: el.fileId,
                })),
                branches: [
                  ...product.branches.map(branch => ({
                    id: branch.id,
                    isMain: branch.isMain,
                    tag: branch.isMain ? altName || (product as any)?.name : branch.tag,
                    description: branch.description,
                    manufacturer: altManufacturer || branch?.manufacturer,
                    autoTypeId: branch.autoTypeId,
                    autoBrandId: branch.autoBrandId,
                    autoModelIds: JSON.parse(branch?.autoModelIds || '[]'),
                    groupId: branch?.groupId,
                    subgroupId: branch?.subgroupId,
                  })),
                ],
                analogs: {
                  added: [], // TODO: new moderator
                  deleted: [],
                },
                applicabilities: {
                  added: [], // TODO: new moderator
                  updated: [],
                  deleted: [],
                },
              },
            },
            authUser,
            authUserRole,
            io,
            req,
            res,
            transaction,
          });
        }
      }

      const requestedProduct = await RequestProduct.findByPk(requestProductData.requestedProductId, { transaction });

      await RequestProduct.create(
        {
          orderId: offer.id,
          ...requestProductData,
          reserveName: requestedProduct?.reserveName,
          reserveArticle: requestedProduct?.reserveArticle,
          reserveManufacturer: requestedProduct?.reserveManufacturer,
        },
        { transaction },
      );
    }

    let orderRequest = await OrderRequest.findOne({
      where: {
        id: query.orderRequestId,
      },
      include: [
        {
          model: Order,
          as: 'orders',
          include: [
            {
              model: RequestProduct,
              as: 'products',
              required: true,
            },
          ],
        },
        {
          model: Address,
          as: 'address',
          required: false,
        },
      ],
      transaction,
    });

    const order = await Order.findByPk(offer.id, {
      include: [
        {
          model: User,
          as: 'seller',
          required: true,
          attributes: ['firstname', 'lastname', 'middlename'],
        },
        {
          model: OrderRequest,
          as: 'orderRequest',
          required: true,
          attributes: ['id', 'idOrder'],
        },
      ],
      transaction,
    });

    const nowDate = new Date();

    const geoCoder = NodeGeocoder({
      provider: 'openstreetmap', // Выберите провайдера геокодирования
    });
    const customerSettlement = orderRequest.address?.city || orderRequest.address?.settlement;
    const customerAddressStr =
      customerSettlement + !!orderRequest.address?.street ? `, ${orderRequest.address?.street}` : '';
    const supplierSettlement = supplierAddress?.city || supplierAddress?.settlement;
    const supplierAddressStr = supplierSettlement + !!supplierAddress?.street ? `, ${supplierAddress?.street}` : '';

    let customerLocation = await geoCoder.geocode(customerAddressStr);
    if (!customerLocation?.length) customerLocation = await geoCoder.geocode(customerSettlement);

    let supplierLocation = await geoCoder.geocode(supplierAddressStr);
    if (!supplierLocation?.length) supplierLocation = await geoCoder.geocode(supplierSettlement);

    const customerCoordinates = !!customerLocation?.[0]
      ? { latitude: customerLocation[0].latitude, longitude: customerLocation[0].longitude }
      : null;
    const supplierCoordinates = !!supplierLocation?.[0]
      ? { latitude: supplierLocation[0].latitude, longitude: supplierLocation[0].longitude }
      : null;
    const distanceToSupplier =
      !!customerCoordinates && !!supplierCoordinates
        ? geolib.getDistance(supplierCoordinates, customerCoordinates)
        : null;

    await order.update(
      {
        sellerLastNotificationCreatedAt: nowDate,
        distanceToSupplier,
      },
      { transaction },
    );

    await OrderRequestSellerData.update(
      {
        lastNotificationCreatedAt: nowDate,
      },
      {
        where: {
          orderRequestId: order.orderRequestId,
          sellerId: order.sellerId,
        },
        transaction,
      },
    );

    await createOrderNotificationService({
      userId: orderRequest.customerId,
      role: 'customer',
      type: ENotificationType.offerToOrderRequest,
      autoread: false,
      orderRequest,
      order,
      seller: order.seller,
      io,
      transaction,
    });

    await createOrderNotificationForAllManagersService({
      type: ENotificationType.offerToOrderRequest,
      autoread: false,
      orderRequest,
      order,
      seller: order.seller,
      io,
      res,
      transaction,
    });

    await updateOrderRequestUserStatusService({
      orderRequestId: orderRequest.id,
      sellerIds: [authUser.id],
      transaction,
    });

    return {
      orderRequest,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при формировании предложения',
      error: err,
    });
  }
};
