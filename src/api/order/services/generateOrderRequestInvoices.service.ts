import { Request, Response } from 'express';
import { Transaction } from 'sequelize';
import _ from 'lodash';
import FileModel from '../../files/models/File.model';
import Order from '../models/Order.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import { generateOrderInvoiceService } from './generateInvoice.service';
import RequestProduct from '../models/RequestProduct.model';

interface IProps {
  orderRequestId: string;
  juristicSubjectId: string;
  req: Request;
  transaction: Transaction;
}

export const generateOrderRequestInvoiceListService = async ({
  orderRequestId,
  juristicSubjectId,
  req,
  transaction,
}: IProps): Promise<FileModel[]> => {
  const orders = await Order.findAll({
    where: {
      orderRequestId: orderRequestId,
    },
    include: [
      { model: RequestProduct, as: 'products', required: true, where: { isSelected: true } },
      { model: OrderRequestFile, as: 'orderFiles' },
    ],
    transaction,
  });

  const createInvoice = async (order: Order) =>
    await generateOrderInvoiceService({
      orderId: order.id,
      juristicSubjectId,
      contractId: order.contractId,
      req,
      transaction,
    });

  const generatedInvoices: FileModel[] = [];

  for (const order of orders) {
    generatedInvoices.push(await createInvoice(order));
  }

  return generatedInvoices;
};
