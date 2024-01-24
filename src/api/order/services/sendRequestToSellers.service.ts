import { Transaction } from 'sequelize';
import User from '../../user/models/User.model';
import { IRequestProduct } from '../interfaces';
import { getSellersByOrderRequestService } from './getSellersByOrderRequest.service';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import Product from '../../catalog/models/Product.model';
import OrderRequestSellerData from '../models/OrderRequestSellerData.model';
import OrderRequest from '../models/OrderRequest.model';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import SellerProductGroups from '../../catalog/models/relations/SellerProductGroups.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import { PUBLIC_PRODUCT_STATUSES } from '../../catalog/data';
import { SocketServer } from '../../../core/socket';

interface IProps {
  selectedSellerIds: string[];
  settlements: any;
  requestProducts: IRequestProduct[];
  productsWithIds: IRequestProduct[];
  describedProducts: IRequestProduct[];
  orderRequest: OrderRequest;
  customer: User;
  authUser: User;
}

export const sendRequestToSellersService = async (
  {
    selectedSellerIds,
    settlements,
    requestProducts,
    productsWithIds,
    describedProducts,
    orderRequest,
    customer,
    authUser,
  }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const sellers = await getSellersByOrderRequestService({
    selectedSellerIds,
    settlements,
    requestProducts,
    authUser,
    transaction,
  });

  if (!!sellers?.length) {
    const products = await Product.findAll({
      where: {
        id: productsWithIds.map(el => el.productId),
      },
      attributes: ['id'],
      transaction,
    });

    for (const seller of sellers) {
      const sellerAutoBrands = await SellerAutoBrands.findAll({
        where: {
          userId: seller.id,
        },
        transaction,
      });
      const sellerProductGroups = await SellerProductGroups.findAll({
        where: {
          userId: seller.id,
        },
        transaction,
      });
      const sellerProductIds: string[] = [];

      for (const product of products) {
        const branches = await ProductBranch.findAll({
          where: {
            productId: product.id,
            status: PUBLIC_PRODUCT_STATUSES,
          },
          transaction,
        });

        for (const branch of branches) {
          if (!!branch?.autoTypeId || !!branch?.autoBrandId) {
            if (!!branch?.autoTypeId && !!branch?.autoBrandId) {
              if (
                !!sellerAutoBrands.find(
                  el => el?.autoTypeId === branch?.autoTypeId && el?.autoBrandId === el?.autoBrandId,
                )
              ) {
                sellerProductIds.push(product.id);
              }
            }
            if (!!branch?.autoTypeId && !branch?.autoBrandId) {
              if (!!sellerAutoBrands.find(el => el?.autoTypeId === branch?.autoTypeId)) {
                sellerProductIds.push(product.id);
              }
            }
            if (!branch?.autoTypeId && !!branch?.autoBrandId) {
              if (!!sellerAutoBrands.find(el => el?.autoBrandId === branch?.autoBrandId)) {
                sellerProductIds.push(product.id);
              }
            }
          }
          if (!!branch?.groupId) {
            if (!!sellerProductGroups?.find(el => el?.productGroupId === branch?.groupId)) {
              sellerProductIds.push(product.id);
            }
          }
        }
      }

      await OrderRequestSellerData.create(
        {
          orderRequestId: orderRequest.id,
          sellerId: seller.id,
          productsNumber: sellerProductIds.length,
          productIds: JSON.stringify(sellerProductIds),
          describedProductsNumber: describedProducts?.length,
          lastNotificationCreatedAt: new Date(),
          sellerStatus: !!describedProducts?.length ? 'ORDER_REQUEST_BY_PHOTO_OR_DESCRIPTION' : 'ORDER_REQUEST',
        },
        { transaction },
      );
    }

    for (const seller of sellers) {
      createOrderNotificationService({
        userId: seller.id,
        role: 'seller',
        type: ENotificationType.createOrderRequest,
        autoread: false,
        orderRequest,
        customer,
        io,
      });
    }
  }
};
