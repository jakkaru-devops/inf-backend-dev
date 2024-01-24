import { Request } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { round } from '../../../utils/common.utils';
import FileModel from '../../files/models/File.model';
import { ENotificationType } from '../../notification/interfaces';
import Organization from '../../organization/models/Organization.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import RequestProduct from '../models/RequestProduct.model';
import Reward from '../models/Reward.model';
import { calculateOrderCash } from '../utils';
import Product from '../../catalog/models/Product.model';
import { getFilePreviewUrl } from '../../catalog/utils';
import seq from 'sequelize';
import { generateOrderRequestInvoiceListService } from './generateOrderRequestInvoices.service';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';
import CustomerContract from '../../user/models/CustomerContract.model';
import { SERVICE_ORGANIZATION_INN } from '../../organization/data';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import ordersService from '../orders.service';
import { ServiceError } from '../../../core/utils/serviceError';
import { SocketServer } from '../../../core/socket';
import catalogService from '../../catalog/catalog.service';

interface IProps {
  orderRequestId: string;
  jurSubjectId: string;
  paymentType: 'card' | 'invoice';
}

interface IResult {
  paymentId: string;
  paymentLink: string;
  invoicePayments: string[];
}

export const approveOrderRequestService = async (
  { orderRequestId, jurSubjectId, paymentType }: IProps,
  { req, io, transaction }: { req: Request; io: SocketServer; transaction: Transaction },
): Promise<IResult> => {
  try {
    if (paymentType === 'card') {
      const { paymentId, paymentLink } = await ordersService.initiatePaymentByCard(
        { orderId: orderRequestId, juristicSubjectId: jurSubjectId },
        { io, transaction },
      );

      return {
        paymentId,
        paymentLink,
        invoicePayments: [],
      };
    }

    const updatedParams = { paymentType };

    const findOrderRequestOptions: seq.FindAndCountOptions = {};

    findOrderRequestOptions.where = { id: orderRequestId };
    findOrderRequestOptions.transaction = transaction;

    let orderRequest = await OrderRequest.findOne(findOrderRequestOptions);

    if (jurSubjectId) {
      updatedParams['payerId'] = jurSubjectId;
    }

    const findOrdersOptions: seq.FindOptions = {
      where: {
        orderRequestId: orderRequest.id,
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: RequestProduct,
          as: 'products',
          required: true,
          include: [{ model: Product, as: 'product' }],
        },
        {
          model: Organization,
          as: 'organization',
          required: true,
        },
        {
          model: OrderRequestFile,
          as: 'orderFiles',
          where: {
            group: 'invoice',
          },
          required: false,
          include: [{ model: FileModel, as: 'file' }],
        },
      ],
      transaction,
    };
    let orders = await Order.findAll(findOrdersOptions);
    orderRequest = orderRequest.toJSON() as OrderRequest;
    orderRequest.orders = orders.map(el => el.toJSON() as Order);

    if (['PAID', 'COMPLETED'].includes(orderRequest.status)) {
      throw new ServiceError({
        status: httpStatus.FORBIDDEN,
        message: 'Ошибка. Заказ уже оплачен',
      });
    }

    updatedParams['status'] = 'APPROVED';

    const selectedOrderIds = orderRequest.orders
      .map(({ id, products }) => products.some(({ isSelected }) => isSelected) && id)
      .filter(Boolean);
    const invoiceSellerIds = orderRequest.orders.filter(el => selectedOrderIds.includes(el.id)).map(el => el.sellerId);
    updatedParams['invoiceSellerIds'] = JSON.stringify(invoiceSellerIds);

    await OrderRequestFile.destroy({
      where: {
        orderRequestId: orderRequest.id,
        group: 'invoice',
      },
      transaction,
    });

    for (const order of orderRequest.orders) {
      await Reward.destroy({
        where: {
          orderId: order.id,
        },
        transaction,
      });
    }

    for (const order of orderRequest.orders) {
      await Order.update(
        {
          idOrder: null,
        },
        {
          where: {
            id: order.id,
          },
          transaction,
        },
      );
    }

    // Filter order and products in orders
    orderRequest.orders = orderRequest.orders
      .filter(
        ({ id, transportCompanyId, isPickup }) => selectedOrderIds.includes(id) && (transportCompanyId || isPickup),
      )
      .map(order => ({
        ...order,
        products: order.products.filter(({ isSelected, count }) => isSelected && count),
      })) as Order[];

    if (!orderRequest.orders.length) {
      throw new ServiceError({
        status: httpStatus.BAD_REQUEST,
        message: 'Необходимо выбрать товары и способ доставки в интересующих предложениях',
      });
    }

    const juristicSubject = !!jurSubjectId ? await JuristicSubject.findByPk(jurSubjectId, { transaction }) : null;

    const addThirdNumber = orderRequest.orders.length > 1;
    // Count orders total price
    for (let i = 0; i < orderRequest.orders.length; i++) {
      const offer = orderRequest.orders[i];
      const org = await Organization.findByPk(offer.organizationId, { transaction });
      const offerTotalPrice = offer.products
        .filter(product => product.isSelected)
        .map(({ unitPrice, count }) => unitPrice * count)
        .filter(Boolean)
        .reduce((a, b) => a + b, 0);

      orderRequest.orders[i].totalPrice = offerTotalPrice;

      const contract =
        org.inn === SERVICE_ORGANIZATION_INN && juristicSubject.isSpecialClient
          ? await CustomerContract.findOne({
              where: {
                customerId: orderRequest.customerId,
                juristicSubjectId: jurSubjectId,
              },
              order: [['createdAt', 'DESC']],
              transaction,
            })
          : null;

      await Order.update(
        {
          totalPrice: offerTotalPrice,
          idOrder: `${orderRequest.idOrder}${addThirdNumber ? `-${i + 1}` : ''}`,
          contractId: contract?.id,
          invoiceGivenAt: new Date(),
        },
        {
          where: {
            id: offer.id,
          },
          transaction,
        },
      );

      await Reward.create(
        {
          orderId: offer.id,
          sellerId: offer.sellerId,
          amount:
            !!org?.priceBenefitPercentAcquiring && !!org?.priceBenefitPercentInvoice
              ? 0
              : round(calculateOrderCash(offerTotalPrice, offer.organization.priceBenefitPercent, true)),
        },
        { transaction },
      );

      for (const offerProduct of offer.products) {
        if (!!offerProduct?.priceOfferId)
          await catalogService.reservePricedProduct({ offer, offerProduct }, { transaction });
      }
    }

    const nowDate = new Date();

    // Count order request total price
    const totalPrice = orderRequest.orders
      .flatMap(({ products }) =>
        products.filter(({ isSelected }) => isSelected).map(({ unitPrice, count }) => unitPrice * count),
      )
      .filter(Boolean)
      .reduce((a, b) => a + b, 0);

    updatedParams['totalPrice'] = totalPrice;
    updatedParams['customerLastNotificationCreatedAt'] = nowDate;

    if (paymentType === 'invoice') {
      await OrderRequest.update(updatedParams, {
        where: {
          id: orderRequest.id,
        },
        transaction,
      });

      const invoices = await generateOrderRequestInvoiceListService({
        orderRequestId: orderRequest.id,
        juristicSubjectId: jurSubjectId,
        req,
        transaction,
      });
      const invoicePayments = invoices.map(file => getFilePreviewUrl(file));

      orders = await Order.findAll(findOrdersOptions);

      await createOrderNotificationForAllManagersService({
        type: ENotificationType.orderInvoicePaymentApproved,
        autoread: false,
        orderRequest,
        io,
        transaction,
      });

      await updateOrderRequestUserStatusService({
        orderRequestId: orderRequest.id,
        transaction,
      });

      return {
        paymentId: null,
        paymentLink: null,
        invoicePayments,
      };
    }

    const updatedOrderRequest = (await OrderRequest.findOne(findOrderRequestOptions)).toJSON() as OrderRequest;
    orders = await Order.findAll(findOrdersOptions);
    updatedOrderRequest.orders = orders;

    await updateOrderRequestUserStatusService({
      orderRequestId: orderRequest.id,
      transaction,
    });

    return {
      paymentLink: null,
      paymentId: null,
      invoicePayments: [],
    };
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при обновлении статуса заказа',
      error: err,
    });
  }
};
