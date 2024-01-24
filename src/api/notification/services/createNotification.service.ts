import { Response } from 'express';
import Notification from '../models/Notification.model';
import SocketIO from 'socket.io';
import { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import httpStatus from 'http-status';
import { defineNotificationModule } from '../utils';
import { sendPushNotification } from '../utils/sendPushNotification';
import Role from '../../role/models/Role.model';
import { IUserRoleOption } from '../../role/interfaces';
import User from '../../user/models/User.model';
import { defineNotificationContent } from '../utils/defineNotificationContent';
import { mailer } from '../../../utils/mailer';

interface IProps {
  userId: string;
  role: Role['label'];
  type: Notification['type'];
  autoread: boolean;
  organizationId?: string;
  productOfferId?: string;
  userComplaintId?: string;
  aboutUserId?: string;
  aboutUserRoleId?: string;
  data?: any;
  io: SocketIO.Server;
  res?: Response;
  transaction?: Transaction;
}

export const createNotification = async ({
  userId,
  role,
  type,
  autoread,
  organizationId,
  productOfferId,
  userComplaintId,
  aboutUserId,
  aboutUserRoleId,
  data,
  io,
  res,
  transaction,
}: IProps) => {
  const roleEntity = await Role.findOne({
    where: { label: role },
    transaction,
  });
  if (!roleEntity) return;
  const roleId = roleEntity.id;

  try {
    let notification = await Notification.create(
      {
        userId,
        roleId,
        type,
        autoread,
        organizationId,
        productOfferId,
        userComplaintId,
        aboutUserId,
        aboutUserRoleId,
        data,
      },
      {
        transaction,
      },
    );
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
    if (res) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Уведомление не отправлено',
        error: err,
      });
    } else {
      throw new Error('Уведомление не отправлено');
    }
  }
};
