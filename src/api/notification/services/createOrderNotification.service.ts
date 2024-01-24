import { Response } from 'express';
import Notification from '../models/Notification.model';
import SocketIO from 'socket.io';
import { Transaction } from 'sequelize';
import User from '../../user/models/User.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import Order from '../../order/models/Order.model';
import { ENotificationType, NotificationData } from '../interfaces';
import httpStatus from 'http-status';
import Role from '../../role/models/Role.model';
import OrderRequestSellerData from '../../order/models/OrderRequestSellerData.model';
import { defineNotificationModule } from '../utils';
import { sendPushNotification } from '../utils/sendPushNotification';
import { ServiceError } from '../../../core/utils/serviceError';
import { IUserRoleOption } from '../../role/interfaces';
import { mailer } from '../../../utils/mailer';
import { defineNotificationContent } from '../utils/defineNotificationContent';

interface ICreateOrderNotificationService {
  userId: string;
  role: Role['label'];
  type: Notification['type'];
  autoread: boolean;
  orderRequest: OrderRequest;
  order?: Order;
  supplierName?: string;
  seller?: User;
  customer?: User;
  io: SocketIO.Server;
  transaction?: Transaction;
}

export const createOrderNotificationService = async ({
  userId,
  role,
  type,
  autoread,
  orderRequest,
  order,
  supplierName,
  seller,
  customer,
  io,
  transaction,
}: ICreateOrderNotificationService) => {
  try {
    let data: NotificationData;
    switch (type) {
      case 'offerToOrderRequest':
        data = {
          orderRequestId: orderRequest.id,
          idOrder: orderRequest.idOrder,
          seller: seller,
        };
        break;
      case 'createOrderRequest':
        data = {
          customerId: customer.id,
          orderRequestId: orderRequest.id,
          idOrder: orderRequest.idOrder,
        };
        break;

      case 'orderPartialPayment':
        data = {
          idOrder: orderRequest.idOrder,
          orderRequestId: orderRequest.id,
          totalPrice: orderRequest.totalPrice,
          paidSum: orderRequest.paidSum,
        };
        break;
      case 'requestPaymentRefund':
        data = {
          idOrder: orderRequest.idOrder,
          orderRequestId: orderRequest.id,
          paidSum: orderRequest.paidSum,
        };
        break;
      case 'paymentRefundRequestPaid':
        data = {
          idOrder: orderRequest.idOrder,
          orderRequestId: orderRequest.id,
          refundSum: orderRequest.paymentRefundRequest.refundSum,
        };
        break;
      case 'offerExpired':
      case 'requestToUpdateOffer':
      case 'offerUpdated':
      case 'orderInvoicePaymentApproved':
      case 'orderInvoicePaymentConfirmed':
      case 'orderAttachmentUploaded':
      case 'orderShipped':
      case 'orderPaid':
      case 'orderPaymentPostponed':
      case 'orderCompleted':
      case 'orderInvoicePaymentCanceled':
      case 'orderBack':
      case 'rewardPaid':
        data = {
          idOrder: orderRequest.idOrder,
          orderRequestId: orderRequest.id,
        };
        break;
      case 'offerInvoicePaymentConfirmed':
      case 'offerInvoicePaymentCanceled':
        data = {
          idOrder: orderRequest.idOrder,
          orderRequestId: orderRequest.id,
          offerId: order.id,
          supplierName,
        };
        break;
      case 'refundProductRequest':
      case 'refundProductAccept':
      case 'refundProductDecline':
      case 'refundProductComplete':
      case 'exchangeProductRequest':
      case 'exchangeProductAccept':
      case 'exchangeProductDecline':
      case 'exchangeProductComplete':
        data = {
          idOrder: orderRequest.idOrder,
          orderRequestId: orderRequest.id,
          orderId: order.id,
        };
        break;
      case 'applicationChangeTransportCompany':
        data = {
          idOrder: orderRequest.idOrder,
          orderRequestId: orderRequest.id,
          seller: seller,
        };
        break;
      case 'approvedChangeTransportCompany':
        data = {
          idOrder: order.idOrder,
          orderRequestId: orderRequest.id,
          customerId: orderRequest.customerId,
        };
        break;
      case 'declinedChangeTransportCompany':
        data = {
          idOrder: orderRequest.idOrder,
          orderRequestId: orderRequest.id,
          customerId: orderRequest.customerId,
        };
      default:
        data = {} as any;
    }

    const nowDate = new Date();
    const roles: { [key in IUserRoleOption]: Role } = {
      customer: await Role.findOne({ where: { label: 'customer' } }),
      seller: await Role.findOne({ where: { label: 'seller' } }),
      manager: await Role.findOne({ where: { label: 'manager' } }),
      operator: await Role.findOne({ where: { label: 'operator' } }),
      moderator: await Role.findOne({ where: { label: 'moderator' } }),
      superadmin: null,
    };
    const roleEntity = roles[role];
    const roleId = roleEntity.id;

    let notification = await Notification.create(
      {
        userId,
        roleId,
        type,
        autoread,
        orderRequestId: orderRequest ? orderRequest.id : null,
        orderId: order ? order.id : null,
        data,
        viewedAt: type === ENotificationType.dummy ? nowDate : null,
      },
      { transaction },
    );

    // Update last notification time on orderRequest and offers
    const updateData: any = {};
    if (roleId === roles.customer.id && !!orderRequest) {
      updateData.customerLastNotificationCreatedAt = nowDate;
    }
    if ((roleId === roles.manager.id || roleId === roles.operator.id) && !!orderRequest) {
      updateData.managerLastNotificationCreatedAt = nowDate;
    }
    if (!!Object.keys(updateData).length) {
      await OrderRequest.update(updateData, {
        where: {
          id: orderRequest.id,
        },
        transaction,
      });
    }

    if (roleId === roles.seller.id && !!orderRequest) {
      await OrderRequestSellerData.update(
        {
          lastNotificationCreatedAt: nowDate,
        },
        {
          where: {
            orderRequestId: orderRequest?.id,
            sellerId: userId,
          },
          transaction,
        },
      );
      await Order.update(
        {
          sellerLastNotificationCreatedAt: nowDate,
        },
        {
          where: {
            orderRequestId: orderRequest?.id,
            sellerId: userId,
          },
          transaction,
        },
      );
    }

    if (type === ENotificationType.dummy) return;

    notification = notification.toJSON() as Notification;
    const module = defineNotificationModule(notification);
    const notificationData = {
      ...notification,
      module,
    };
    io.to(userId).emit('SERVER:NEW_NOTIFICATION', notificationData);

    if ((['customer', 'seller'] as IUserRoleOption[]).includes(role)) {
      const user = await User.findByPk(userId);

      sendPushNotification({
        userId,
        roleId,
        notification,
        message: null,
        module,
      });

      if (user.emailNotification && user.isAgreeEmailNotification) {
        let mailerMessage = defineNotificationContent(notification, user);
        mailer(mailerMessage.message);
      }
    }
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Уведомление не отправлено',
      error: err,
    });
  }
};
