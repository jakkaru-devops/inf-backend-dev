import { Response } from 'express';
import OrderRequest from '../../order/models/OrderRequest.model';
import Order from '../../order/models/Order.model';
import RequestProduct from '../../order/models/RequestProduct.model';
import Product from '../../catalog/models/Product.model';
import { APIError } from '../../../utils/api.utils';
import httpStatus from 'http-status';
import Organization from '../../organization/models/Organization.model';
import User from '../../user/models/User.model';
import { CBIReceiptInterface, IReceipt, ShiftInfo } from '../interfaces';
import formatDate from 'date-fns/format';
import { calculateNds } from '../../../utils/common.utils';
import { Transaction } from 'sequelize';

export const getDataReceiptService = async ({
  orderRequestId,
  actualReceipt,
  res,
  shiftInfo,
}: // transaction,
{
  orderRequestId: string;
  actualReceipt: CBIReceiptInterface;
  res: Response;
  shiftInfo?: ShiftInfo;
  // transaction: Transaction;
}): Promise<IReceipt> => {
  try {
    let orderRequest = await OrderRequest.findByPk(orderRequestId, {
      include: [
        {
          model: Order,
          as: 'orders',
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: RequestProduct,
              as: 'products',
              required: true,
              attributes: ['id', 'idInt', 'count', 'quantity', 'unitPrice', 'deliveryQuantity'],
              include: [
                {
                  model: Product,
                  as: 'product',
                  required: true,
                  attributes: ['name_ru', 'name_en', 'article', 'manufacturer'],
                },
              ],
            },
            {
              model: Organization,
              as: 'organization',
              required: true,
              attributes: ['id', 'idInt', 'name', 'shopName', 'hasNds', 'inn'],
            },
          ],
        },
        {
          model: User,
          as: 'customer',
          required: true,
          attributes: ['email'],
        },
      ],
      // transaction,
    });

    orderRequest = orderRequest.toJSON() as OrderRequest;

    const totalNds = orderRequest.orders
      .map(order => (order.organization.hasNds ? calculateNds(order.totalPrice) : 0))
      .reduce((prev, current) => prev + current);

    const receiptDate = actualReceipt.receipt_datetime || actualReceipt.date_create;

    return {
      // PSB
      receiptDate: formatDate(new Date(receiptDate), 'dd-MM-yy HH:mm'),
      orderNumber: orderRequest.idOrder,
      calculationService: 'https://www.psbank.ru/',
      avtomat: actualReceipt.shift_ref.toString(), // TODO
      customerEmail: orderRequest.customer.email,
      inn: '3801147025', // TODO
      receiptNumber: actualReceipt.c_num,
      turnNumber: shiftInfo?.num || '000000000000',
      fnsSite: 'www.nalog.gov.ru',
      RnKkt: actualReceipt.ecr_registration_number || '000000000000',
      fn: actualReceipt.fn_number || '000000000000',
      fd: actualReceipt.fiscal_document_number || '000000000000',
      fp: actualReceipt.fiscal_document_attribute.toString(),
      total: (orderRequest.totalPrice
        ? orderRequest.totalPrice
        : orderRequest.orders.map(order => order.totalPrice).reduce((prev, current) => prev + current)
      ).toFixed(2),
      totalReceived: (orderRequest.totalPrice
        ? orderRequest.totalPrice
        : orderRequest.orders.map(order => order.totalPrice).reduce((prev, current) => prev + current)
      ).toFixed(2),
      totalNds: totalNds.toFixed(2),
      orders: orderRequest.orders.map(order => ({
        supplier: order.organization.name,
        supplierInn: order.organization.inn,
        products: order.products.map(offerProduct => ({
          name: offerProduct?.altName || offerProduct.product.name_ru,
          article: offerProduct?.altArticle || offerProduct.product.article,
          brand: offerProduct?.altManufacturer || offerProduct.product.manufacturer,
          prepayment: ((offerProduct.count || 1) * offerProduct.unitPrice).toFixed(2),
          price: offerProduct.unitPrice.toFixed(2),
          count: !offerProduct.count ? 1 : offerProduct.count,
          ndsFormat: order.organization.hasNds ? 'НДС 20%, руб.:' : 'Товар без НДС',
          nds: order.organization.hasNds
            ? calculateNds((offerProduct.count || 1) * offerProduct.unitPrice).toFixed(2)
            : null,
        })),
      })),
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Произошла ошибка при выдаче чека',
      error: err,
    });
  }
};
