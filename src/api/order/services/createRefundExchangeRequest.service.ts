import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Transaction, Op } from 'sequelize';
import SocketIO from 'socket.io';
import { APIError } from '../../../utils/api.utils';
import { simplifyHtml } from '../../../utils/common.utils';
import FileModel from '../../files/models/File.model';
import { ENotificationType } from '../../notification/interfaces';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';
import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import RefundExchangeRequest from '../models/RefundExchangeRequest.model';
import RefundExchangeRequestFile from '../models/RefundExchangeRequestFile.model';
import RequestProduct from '../models/RequestProduct.model';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';

interface IProps {
  requestProductId: string;
  orderId: string;
  disputeResolution: string;
  quantity: number;
  reason: string;
  comment: string;
  io: SocketIO.Server;
  req: Request;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  refundExchangeRequest: RefundExchangeRequest;
}

export const createRefundExchangeRequestService = async ({
  requestProductId,
  orderId,
  disputeResolution,
  quantity,
  reason,
  comment,
  io,
  req,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const authUser: User = req.body.authUser;
    const authUserRole: UserRoles = req.body.authUserRole;

    const requestProduct = await RequestProduct.findByPk(requestProductId, {
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: OrderRequest,
              as: 'orderRequest',
              where: { customerId: authUser.id },
              required: true,
            },
          ],
        },
        {
          model: RefundExchangeRequest,
          as: 'refundExchangeRequest',
        },
      ],
      transaction,
    });

    if (!requestProduct) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Не удалось подать заявку на возврат/обмен',
      });
    }

    const existingRefundExchangeRequest = await RefundExchangeRequest.findOne({
      where: {
        customerId: authUser.id,
        requestProductId: requestProduct.id,
        status: {
          [Op.ne]: 'CLOSED',
        },
      },
      transaction,
    });
    if (existingRefundExchangeRequest) {
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'Ошибка. Заявка на возврат/обмен этого товара уже создана',
      });
    }

    const refundExchangeRequest = await RefundExchangeRequest.create(
      {
        requestProductId,
        orderId,
        disputeResolution,
        orderedQuantity: requestProduct.count,
        quantity,
        reason: simplifyHtml(reason),
        comment: simplifyHtml(comment) || null,
        customerId: authUser.id,
      },
      { transaction },
    );

    if (req.body.fileIds) {
      const uploadedFiles = await FileModel.findAll({
        where: { id: req.body.fileIds },
        transaction,
      });

      uploadedFiles.forEach(async uploadedFile => {
        await RefundExchangeRequestFile.create(
          {
            refundExchangeRequestId: refundExchangeRequest.id,
            fileId: uploadedFile.id,
          },
          {
            transaction,
          },
        );

        // await fs.promises.rename(`${UPLOAD_FILES_DIRECTORY}/${uploadedFile.path}`, newActualPath);
      });
    }

    await Order.update(
      {
        hasActiveRefundExchangeRequest: true,
      },
      {
        where: { id: requestProduct.order.id },
        transaction,
      },
    );
    await OrderRequest.update(
      {
        hasActiveRefundExchangeRequest: true,
        customerLastNotificationCreatedAt: new Date(),
      },
      {
        where: {
          id: requestProduct.order.orderRequestId,
        },
        transaction,
      },
    );

    await createOrderNotificationService({
      userId: requestProduct.order.sellerId,
      role: 'seller',
      type:
        disputeResolution === 'REFUND'
          ? ENotificationType.refundProductRequest
          : ENotificationType.exchangeProductRequest,
      autoread: false,
      orderRequest: requestProduct.order.orderRequest,
      order: requestProduct.order,
      io,
      transaction,
    });

    await createOrderNotificationForAllManagersService({
      type:
        disputeResolution === 'REFUND'
          ? ENotificationType.refundProductRequest
          : ENotificationType.exchangeProductRequest,
      autoread: false,
      orderRequest: requestProduct.order.orderRequest,
      order: requestProduct.order,
      io,
      res,
      transaction,
    });

    const orderRequest = requestProduct?.order?.orderRequest;
    await updateOrderRequestUserStatusService({
      orderRequestId: orderRequest.id,
      sellerIds: [requestProduct?.order?.sellerId],
      transaction,
    });

    return {
      refundExchangeRequest,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при создании заявки на возврат/обмен',
      error: err,
    });
  }
};
