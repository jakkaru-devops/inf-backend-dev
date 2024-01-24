import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import SocketIO from 'socket.io';
import { APIError } from '../../../utils/api.utils';
import FileModel from '../../files/models/File.model';
import { ENotificationType } from '../../notification/interfaces';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import Organization from '../../organization/models/Organization.model';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';
import { IRequestProduct } from '../interfaces';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import RequestProduct from '../models/RequestProduct.model';
import { validateOrderData } from '../utils';
import addDate from 'date-fns/add';
import { RENEWAL_TIME } from '../../../config/env';
import { createProductOfferService } from '../../catalog/services/createProductOffer.service';
import seq from 'sequelize';
import { generateOrderInvoiceService } from './generateInvoice.service';
import { DEFAULT_CATALOG_SECTION, PRODUCT_STATUSES } from '../../catalog/data';
import CatalogSection from '../../catalog/models/CatalogSection.model';
import OrderRequestSellerData from '../models/OrderRequestSellerData.model';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';

interface IProps {
  orderId: string;
  organizationId: string;
  requestProducts: IRequestProduct[];
  trackNumber: string;
  departureDate: Date;
  receivingDate: Date;
  io: SocketIO.Server;
  req: Request;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  order: Order;
  orderRequest: OrderRequest;
}

export const updateOrderService = async ({
  orderId,
  organizationId,
  requestProducts,
  trackNumber,
  departureDate,
  receivingDate,
  io,
  req,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const authUser: User = req.body.authUser;
    const authUserRole: UserRoles = req.body.authUserRole;

    await validateOrderData({ organizationId, products: requestProducts });

    const options: seq.FindOptions = {
      where: { id: orderId },
      include: [
        {
          model: RequestProduct,
          as: 'products',
          required: true,
        },
        {
          model: OrderRequest,
          as: 'orderRequest',
          required: true,
          include: [
            {
              model: Order,
              as: 'orders',
              separate: true,
            },
          ],
        },
        {
          model: Organization,
          as: 'organization',
        },
      ],
      transaction,
    };

    const order = await Order.findOne(options);
    let orderRequest = await OrderRequest.findByPk(order.orderRequestId, {
      transaction,
    });

    const updateParams: {
      totalPrice?: number;
      trackNumber?: string;
      departureDate?: Date;
      receivingDate?: Date;
      isExpiredOffer?: boolean;
      isRequestedToUpdateOffer?: boolean;
      offerExpiresAt?: Date;
      sellerUpdatedAt?: Date;
      status?: string;
    } = {};

    if (requestProducts) {
      const productEntities = await RequestProduct.findAll({ where: { orderId: order.id }, transaction });

      for (const productEntity of productEntities) {
        const productData = requestProducts.find(({ productId }) => productId === productEntity.productId);

        if (productData) {
          if (productData.count > (productData?.quantity || 0) + (productData?.deliveryQuantity || 0)) {
            productData.count = (productData?.quantity || 0) + (productData?.deliveryQuantity || 0);
          }
          await productEntity.update(
            {
              ...productData,
              orderId: order.id,
            },
            {
              transaction,
            },
          );
        } else {
          await productEntity.destroy({ transaction });
        }
      }

      const catalogSection = await CatalogSection.findOne({
        where: {
          label: DEFAULT_CATALOG_SECTION.label,
        },
        transaction,
      });

      for (const productData of requestProducts) {
        const productEntity = productEntities.find(({ productId }) => productId === productData.productId);
        if (!!productEntity) productData.isSelected = productEntity.isSelected;
        if (productEntity) continue;

        if (!!productData?.newProduct) {
          const newProduct = productData?.newProduct;

          // const existingProduct = await Product.findOne({
          //   where: {
          //     articleSimplified: simplifyProductArticle(newProduct?.article),
          //   },
          // });
          // if (!!existingProduct) {
          //   throw APIError({
          //     res,
          //     status: httpStatus.BAD_REQUEST,
          //     message: `productAlreadyExists-${JSON.stringify([
          //       existingProduct.id,
          //       existingProduct?.article,
          //       existingProduct?.name_ru,
          //     ])}`,
          //   });
          // }

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
                ], // TODO: new moderator
              },
            },
            authUser,
            authUserRole,
            io,
            req,
            res,
            transaction,
          });
          productData.productId = product.id;
        }

        await RequestProduct.create(
          {
            ...productData,
            orderId: order.id,
          },
          {
            transaction,
          },
        );
      }

      updateParams.totalPrice = requestProducts
        .filter(product => product.isSelected)
        .map(
          ({ count, quantity, deliveryQuantity, unitPrice }) =>
            Math.min(count, (quantity || 0) + (deliveryQuantity || 0)) * unitPrice,
        )
        .reduce((a, b) => a + b, 0);
    }

    const isReceived = !!order.receivingDate;

    if (!!trackNumber) {
      if (authUserRole.role.label === 'seller' && isReceived) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: 'Нельзя добавить трек-номер, заказ уже получен покупателем',
        });
      }
      updateParams.trackNumber = trackNumber;
    }

    if (!!departureDate) {
      if (authUserRole.role.label === 'seller' && isReceived) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: 'Нельзя добавить дату отгрузки, заказ уже получен покупателем',
        });
      }
      updateParams.departureDate = new Date(departureDate);
    }

    if (typeof receivingDate !== 'undefined') {
      if (!!receivingDate) {
        if (authUserRole.role.label !== 'seller') {
          updateParams.receivingDate = new Date(receivingDate);
        }
        if (!(authUserRole.role.label === 'seller' && !receivingDate)) {
          updateParams.receivingDate = new Date(receivingDate);
        }
      } else {
        updateParams.receivingDate = null;
      }
    }

    // When seller's expired offer updated
    if (order.isExpiredOffer && order.isRequestedToUpdateOffer) {
      await createOrderNotificationService({
        userId: order.orderRequest.customerId,
        role: 'customer',
        type: ENotificationType.offerUpdated,
        autoread: false,
        order,
        orderRequest: order.orderRequest,
        io,
        transaction,
      });

      await createOrderNotificationForAllManagersService({
        type: ENotificationType.offerUpdated,
        autoread: false,
        order,
        orderRequest: order.orderRequest,
        io,
        res,
        transaction,
      });

      updateParams.isExpiredOffer = false;
      updateParams.isRequestedToUpdateOffer = false;
      updateParams.offerExpiresAt = addDate(new Date(), RENEWAL_TIME);
      updateParams.sellerUpdatedAt = new Date();
    }

    console.log('TEST 1', orderRequest?.paidSum);
    console.log('TEST 2', order?.paidSum);
    console.log(
      'TEST 3',
      (!!order?.paidSum || !!orderRequest?.paidSum) &&
        !!updateParams?.totalPrice &&
        updateParams?.totalPrice <= (order?.paidSum || orderRequest?.paidSum),
    );

    if (
      (!!order?.paidSum || !!orderRequest?.paidSum) &&
      !!updateParams?.totalPrice &&
      updateParams?.totalPrice <= (order?.paidSum || orderRequest?.paidSum)
    ) {
      updateParams.status = 'PAID';
      await RequestProduct.destroy({
        where: {
          orderId: order.id,
          isSelected: false,
        },
        transaction,
      });
    }

    await order.update(updateParams, {
      transaction,
    });

    const updatedOrder = await Order.findOne(options);

    orderRequest = await OrderRequest.findByPk(order.orderRequestId, {
      include: [
        {
          model: Order,
          as: 'orders',
          required: true,
        },
      ],
      transaction,
    });

    const nowDate = new Date();

    if (
      orderRequest.status === 'COMPLETED' &&
      !orderRequest.orders.every(offer => !!offer.receivingDate && offer.status === 'PAID')
    ) {
      await orderRequest.update(
        {
          status: 'PAID',
          customerLastNotificationCreatedAt: nowDate,
          managerLastNotificationCreatedAt: nowDate,
          completionDate: null,
        },
        { transaction },
      );
    }

    if (
      orderRequest.status !== 'COMPLETED' &&
      !!orderRequest.orders.length &&
      orderRequest.orders.every(offer => !!offer.receivingDate && offer.status === 'PAID')
    ) {
      await orderRequest.update(
        {
          status: 'COMPLETED',
          completionDate: nowDate,
          customerLastNotificationCreatedAt: nowDate,
          managerLastNotificationCreatedAt: nowDate,
        },
        { transaction },
      );
    }

    orderRequest = await OrderRequest.findByPk(order.orderRequestId, {
      include: [
        {
          model: Order,
          as: 'orders',
          required: true,
          include: [{ model: RequestProduct, as: 'products' }],
        },
      ],
      transaction,
    });

    let totalPrice = 0;
    for (const orderEntity of orderRequest.orders) {
      totalPrice += orderEntity.products
        .filter(product => product.isSelected)
        .map(
          ({ count, quantity, deliveryQuantity, unitPrice }) =>
            Math.min(count, (quantity || 0) + (deliveryQuantity || 0)) * unitPrice,
        )
        .reduce((a, b) => a + b, 0);
    }

    // throw new Error('TEST');

    if (!!orderRequest.paidSum && !!orderRequest.totalPrice && orderRequest.paidSum >= totalPrice) {
      const status: OrderRequest['status'] =
        orderRequest.paidSum >= totalPrice && orderRequest.status === 'APPROVED' ? 'PAID' : orderRequest.status;
      const updateData: any = {
        totalPrice,
        status,
        customerLastNotificationCreatedAt: nowDate,
        managerLastNotificationCreatedAt: nowDate,
      };
      if (status === 'PAID') {
        updateData.paymentDate = new Date();
      }

      orderRequest = await orderRequest.update(updateData, { transaction });
    }

    const invoice = await OrderRequestFile.findOne({
      where: { orderId: order.id, group: 'invoice' },
      include: [{ model: FileModel, as: 'file', required: true }],
      transaction,
    });
    if (invoice) {
      const orderNumberStrIndex = invoice.file.name.indexOf(orderRequest.idOrder);
      const str = invoice.file.name.replace(orderRequest.idOrder, '');
      await invoice.destroy({ transaction });
      await generateOrderInvoiceService({
        orderId: order.id,
        juristicSubjectId: orderRequest.payerId,
        contractId: order.contractId,
        req,
        transaction,
      });
    }

    if (departureDate) {
      await order.update(
        {
          sellerLastNotificationCreatedAt: nowDate,
        },
        {
          transaction,
        },
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
        userId: order.orderRequest.customerId,
        role: 'customer',
        type: ENotificationType.orderShipped,
        autoread: false,
        orderRequest: order.orderRequest,
        order,
        io,
        transaction,
      });

      await createOrderNotificationForAllManagersService({
        type: ENotificationType.orderShipped,
        autoread: false,
        orderRequest: order.orderRequest,
        order,
        io,
        res,
        transaction,
      });
    }

    if (
      !!receivingDate &&
      updatedOrder.orderRequest.status === 'COMPLETED' &&
      !!updatedOrder.orderRequest.orders.length &&
      updatedOrder.orderRequest.orders.every(offer => !!offer.receivingDate || offer.status === 'PAID')
    ) {
      // Notifications block start
      const sellerIds = updatedOrder.orderRequest.orders.map(item => item.sellerId);

      for (const sellerId of sellerIds) {
        await createOrderNotificationService({
          userId: sellerId,
          role: 'seller',
          type: ENotificationType.orderCompleted,
          autoread: false,
          orderRequest: updatedOrder.orderRequest,
          io,
          transaction,
        });
      }

      await createOrderNotificationForAllManagersService({
        type: ENotificationType.orderCompleted,
        autoread: false,
        orderRequest: updatedOrder.orderRequest,
        io,
        res,
        transaction,
      });

      await createOrderNotificationService({
        userId: updatedOrder.orderRequest.customerId,
        role: 'customer',
        type: ENotificationType.orderCompleted,
        autoread: false,
        orderRequest: updatedOrder.orderRequest,
        order,
        io,
        transaction,
      });
      // Notifications block end
    }

    await updateOrderRequestUserStatusService({
      orderRequestId: orderRequest.id,
      sellerIds: [order.sellerId],
      transaction,
    });

    return {
      order,
      orderRequest,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при обновлении заказ',
      error: err,
    });
  }
};
