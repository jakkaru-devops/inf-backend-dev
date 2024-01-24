import Order from '../models/Order.model';
import httpStatus from 'http-status';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import ReasonToRejectShippingCondition from '../models/reasonToRejectShippingCondition.model';
import User from '../../user/models/User.model';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import Role from '../../role/models/Role.model';
import { ENotificationType } from '../../notification/interfaces';
import OrderRequest from '../models/OrderRequest.model';
import SocketIO from 'socket.io';
import { Response } from 'express';
import { Transaction } from 'sequelize';
import { updateOrderRequestUserStatusService } from './updateOrderRequestUserStatus.service';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';

interface IReason {
  reason: string;
  orderId: string;
  userId: string;
}

/**
 * @desc      Application to change transport company from customer
 * @route     PATCH /order/change-transport-company/:id
 * @body      {
 *              transportCompanyId?: TransportCompany['id]
 *            }
 * @success 	{ data: { message: string } }
 * @access    Private: manageOrderRequestsAvailable
 */
export const applicationChangeShippingConditionService = async (
  id: string,
  transportCompanyId: string,
  io: SocketIO.Server,
  res: Response,
  transaction: Transaction,
): Promise<IServiceResponse<{ message: string }>> => {
  try {
    if (typeof transportCompanyId !== 'undefined') {
      await Order.update(
        {
          notConfirmedTransportCompanyId: transportCompanyId !== 'pickup' ? transportCompanyId : null,
          notConfirmedPickup: transportCompanyId === 'pickup',
          changedTransportCompany: true,
        },
        { where: { id }, transaction },
      );
      const orderData = await Order.findByPk(id, {
        transaction,
      });
      const orderRequest = await OrderRequest.findByPk(orderData.orderRequestId, {
        transaction,
      });
      await orderRequest.update(
        {
          customerLastNotificationCreatedAt: new Date(),
        },
        {
          transaction,
        },
      );

      await createOrderNotificationService({
        userId: orderData.sellerId,
        role: 'seller',
        type: ENotificationType.applicationChangeTransportCompany,
        autoread: false,
        orderRequest,
        order: orderData,
        io,
        transaction,
      });

      await createOrderNotificationForAllManagersService({
        type: ENotificationType.applicationChangeTransportCompany,
        autoread: false,
        orderRequest,
        order: orderData,
        io,
        res,
        transaction,
      });

      await updateOrderRequestUserStatusService({
        orderRequestId: orderRequest.id,
        sellerIds: [orderData.sellerId],
        transaction,
      });
    }
    return {
      result: {
        message: 'Заявка отправлена успешно',
      },
    };
  } catch (err) {
    return {
      error: {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при отправке заявки на изменение транспортных условий',
        error: err,
      },
    };
  }
};

export const approvalOfChangeTransportConditions = async (
  id: string,
  approved: boolean,
  userId: User,
  reason: string,
  res: Response,
  io: SocketIO.Server,
  transaction: Transaction,
): Promise<IServiceResponse<{ message: string }>> => {
  try {
    const orderData = await Order.findByPk(id);
    const orderRequestData = await OrderRequest.findByPk(orderData.orderRequestId);

    if (approved === true && typeof orderData.notConfirmedTransportCompanyId !== 'undefined') {
      await Order.update(
        {
          transportCompanyId:
            orderData.notConfirmedTransportCompanyId !== 'pickup' ? orderData.notConfirmedTransportCompanyId : null,
          isPickup: orderData.notConfirmedPickup,
          changedTransportCompany: false,
          // notConfirmedPickup: null,
          // notConfirmedTransportCompanyId: null,
        },
        { where: { id } },
      );

      await createOrderNotificationService({
        userId: orderRequestData.customerId,
        role: 'customer',
        type: ENotificationType.approvedChangeTransportCompany,
        autoread: false,
        orderRequest: orderRequestData,
        order: orderData,
        io,
      });

      await createOrderNotificationForAllManagersService({
        type: ENotificationType.approvedChangeTransportCompany,
        autoread: false,
        orderRequest: orderRequestData,
        order: orderData,
        io,
        res,
        transaction,
      });
    } else {
      await Order.update(
        {
          changedTransportCompany: false,
          notConfirmedPickup: null,
          notConfirmedTransportCompanyId: null,
        },
        { where: { id } },
      );
      await ReasonToRejectShippingCondition.create({
        userId: userId.id,
        orderId: id,
        reason: reason,
      });

      await createOrderNotificationService({
        userId: orderRequestData.customerId,
        role: 'customer',
        type: ENotificationType.declinedChangeTransportCompany,
        autoread: false,
        orderRequest: orderRequestData,
        order: orderData,
        io,
      });

      await createOrderNotificationForAllManagersService({
        type: ENotificationType.declinedChangeTransportCompany,
        autoread: false,
        orderRequest: orderRequestData,
        order: orderData,
        io,
        res,
        transaction,
      });
    }

    await updateOrderRequestUserStatusService({
      orderRequestId: orderRequestData.id,
      sellerIds: [orderData.sellerId],
      transaction,
    });
  } catch (err) {
    return {
      error: {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при изменение транспортных условий',
        error: err,
      },
    };
  }
};

export const getReasonToRejectShippingCondition = async (id: string): Promise<IServiceResponse<IReason>> => {
  try {
    const reasonData: IReason = await ReasonToRejectShippingCondition.findOne({ where: { orderId: id } });
    return {
      result: reasonData,
    };
  } catch (err) {
    return {
      error: {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при показе причины отклонения',
        error: err,
      },
    };
  }
};
