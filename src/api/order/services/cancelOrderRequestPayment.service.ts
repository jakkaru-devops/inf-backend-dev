import { Request } from 'express';
import httpStatus from 'http-status';
import seq, { Op, Transaction } from 'sequelize';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import User from '../../user/models/User.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import RequestProduct from '../models/RequestProduct.model';

interface IProps {
  id: string;
  req: Request;
  transaction: Transaction;
}

interface IResult {
  success: boolean;
}

export const cancelOrderRequestPaymentService = async ({
  id,
  req,
  transaction,
}: IProps): Promise<IServiceResponse<IResult>> => {
  try {
    const { query } = req;
    const authUser: User = req.body.authUser;

    const orderRequest = await OrderRequest.findByPk(query.id as string, {
      transaction,
    });

    if (orderRequest.customerId !== authUser.id) {
      return {
        error: {
          status: httpStatus.FORBIDDEN,
          message: 'Ошибка. Недостаточно прав для отмены платежа на запросе ' + orderRequest.idOrder,
        },
      };
    }

    await orderRequest.update(
      {
        status: 'REQUESTED',
      },
      {
        transaction,
      },
    );

    const orders = await Order.findAll({
      where: { orderRequestId: orderRequest.id },
      include: [
        { model: RequestProduct, as: 'products', paranoid: false },
        { model: OrderRequestFile, as: 'orderFiles', where: { group: 'invoice' }, paranoid: true, required: false },
      ],
      paranoid: false,
      transaction,
    });

    for (const order of orders) {
      await order.restore({
        transaction,
      });
      for (const product of order.products) {
        await product.restore({
          transaction,
        });
      }
      for (const invoice of order.orderFiles) {
        await invoice.destroy({ transaction });
      }
    }

    return {
      result: {
        success: true,
      },
    };
  } catch (err) {
    return {
      error: {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при отмене оплаты',
        error: err,
      },
    };
  }
};
