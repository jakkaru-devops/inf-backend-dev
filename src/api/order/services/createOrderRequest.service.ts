import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import CartProduct from '../../cart/models/CartProduct.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import DescribedProductAutoBrands from '../../catalog/models/DescribedProductAutoBrands.model';
import DescribedProductFile from '../../catalog/models/DescribedProductFile.model';
import Product from '../../catalog/models/Product.model';
import FileModel from '../../files/models/File.model';
import { ENotificationType } from '../../notification/interfaces';
import Notification from '../../notification/models/Notification.model';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';
import { setSelectedRegionsSettlements } from '../../regions/services/setSelectedRegionsSettlements';
import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';
import { IRequestProduct } from '../interfaces';
import OrderRequest from '../models/OrderRequest.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import RequestProduct from '../models/RequestProduct.model';
import ordersService from '../orders.service';
import { simplifyHtml } from '../../../utils/common.utils';
import { SocketServer } from '../../../core/socket';
import { ServiceError } from '../../../core/utils/serviceError';

interface IProps {
  authUser: User;
  authUserRole: UserRoles;
  deliveryAddress: Address;
  settlements: string[];
  paymentPostponedAt?: Date;
  selectedSellerIds: string[];
  saveSelectedSellers?: boolean;
  comment: string;
  fileIds: string[];
  requestProducts: IRequestProduct[];
  repeatOrder: boolean;
  io: SocketServer;
  transaction: Transaction;
}

interface IResult {
  orderRequest: OrderRequest;
}

const MAX_PRODUCTS_QUANTITY = 100;

export const createOrderRequestService = async ({
  authUser,
  authUserRole,
  deliveryAddress,
  settlements,
  paymentPostponedAt,
  selectedSellerIds,
  saveSelectedSellers,
  comment,
  fileIds,
  requestProducts,
  repeatOrder,
  io,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    if (requestProducts.length > MAX_PRODUCTS_QUANTITY) {
      throw new ServiceError({
        status: httpStatus.BAD_REQUEST,
        message: `Максимальное кол-во товаров в запросе - ${MAX_PRODUCTS_QUANTITY} шт`,
      });
    }

    const productsWithIds = requestProducts.filter(({ productId }) => productId);
    const describedProducts = requestProducts.filter(({ describedProductData }) => describedProductData);

    delete deliveryAddress.id;
    delete deliveryAddress.idInt;
    delete (deliveryAddress as any).createdAt;
    delete (deliveryAddress as any).updatedAt;

    const address = await Address.create(transformAddress({ ...deliveryAddress }), { transaction });

    const idOrder = await ordersService.defineNewOrderId({ user: authUser }, { transaction });
    const nowDate = new Date();
    const orderRequest = await OrderRequest.create(
      {
        idOrder,
        deliveryAddressId: address.id,
        customerId: authUser.id,
        paymentPostponedAt,
        selectedSellerIds: selectedSellerIds && selectedSellerIds.length > 0 ? selectedSellerIds.join(' ') : null,
        comment: simplifyHtml(comment),
        productIds: JSON.stringify(productsWithIds.map(el => el.productId)),
        customerLastNotificationCreatedAt: nowDate,
        managerLastNotificationCreatedAt: nowDate,
        customerStatus: 'REQUESTED',
        managerStatus: !!describedProducts?.length ? 'ORDER_REQUEST_BY_PHOTO_OR_DESCRIPTION' : 'ORDER_REQUEST',
      },
      { transaction },
    );

    // Save request's settlements
    if (!!settlements?.length) {
      await setSelectedRegionsSettlements({ data: settlements, orderRequestId: orderRequest.id, transaction });
    }

    // Create products for plain request
    if (productsWithIds.length > 0) {
      for (const { productId, quantity } of productsWithIds) {
        const product = await Product.findByPk(productId, { transaction });
        if (!product)
          throw new ServiceError({
            status: httpStatus.BAD_REQUEST,
            message: 'Товар в запросе отсутствует в каталоге',
          });

        await RequestProduct.create(
          {
            orderRequestId: orderRequest.id,
            productId,
            quantity,
          },
          { transaction },
        );
      }
    }

    // Create products for request by photo/description
    if (describedProducts.length > 0) {
      for (const { describedProductData, quantity } of describedProducts) {
        if (!describedProductData?.productGroupIds?.length && !describedProductData?.autoBrands?.length) {
          throw new ServiceError({
            status: httpStatus.BAD_REQUEST,
            message: 'Необходимо указать категории товаров',
          });
        }

        const createdDescribedProduct = await DescribedProduct.create(
          {
            description: simplifyHtml(describedProductData?.description),
            productGroupIds: describedProductData.productGroupIds,
          },
          { transaction },
        );

        for (const autoBrandData of describedProductData.autoBrands) {
          await DescribedProductAutoBrands.create(
            {
              describedProductId: createdDescribedProduct.id,
              autoTypeId: autoBrandData.autoTypeId,
              autoBrandId: autoBrandData.autoBrandId,
            },
            { transaction },
          );
        }

        const uploadedFiles = await FileModel.findAll({
          where: { id: describedProductData.fileIds },
          transaction,
        });

        for (const uploadedFile of uploadedFiles) {
          await DescribedProductFile.create(
            {
              describedProductId: createdDescribedProduct.id,
              fileId: uploadedFile.id,
            },
            {
              transaction,
            },
          );
        }

        await RequestProduct.create(
          {
            orderRequestId: orderRequest.id,
            describedProductId: createdDescribedProduct.id,
            quantity,
          },
          { transaction },
        );
      }
    }

    // Create files for plain request
    if (fileIds) {
      const uploadedFiles = await FileModel.findAll({ where: { id: fileIds }, transaction });

      // Create order request files
      for (const uploadedFile of uploadedFiles) {
        await OrderRequestFile.create(
          {
            orderRequestId: orderRequest.id,
            fileId: uploadedFile.id,
          },
          { transaction },
        );
      }
    }

    if (!repeatOrder) {
      await CartProduct.destroy({
        where: {
          userId: authUser.id,
          priceOfferId: null,
        },
        transaction,
      });
    }

    if (typeof saveSelectedSellers !== undefined) {
      const savedSellerIds = saveSelectedSellers && selectedSellerIds?.length > 0 ? selectedSellerIds.join(' ') : null;
      await authUser.update(
        {
          savedSellerIds,
        },
        { transaction },
      );
    }

    await Notification.create(
      {
        userId: authUser.id,
        roleId: authUserRole.roleId,
        data: {},
        type: ENotificationType.dummy,
        autoread: false,
        orderRequestId: orderRequest.id,
        viewedAt: new Date(),
      },
      { transaction },
    );

    const customer = await User.findByPk(orderRequest.customerId, {
      attributes: ['id', 'phone', 'firstname', 'lastname', 'middlename'],
      transaction,
    });

    createOrderNotificationForAllManagersService({
      type: ENotificationType.createOrderRequest,
      autoread: false,
      orderRequest,
      customer,
      io,
    });

    ordersService.sendRequestToSellers(
      {
        selectedSellerIds,
        settlements,
        requestProducts,
        productsWithIds,
        describedProducts,
        orderRequest,
        customer,
        authUser,
      },
      { io, transaction: null },
    );

    return {
      orderRequest,
    };
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Запрос не создан',
      error: err,
    });
  }
};
