import { Response } from 'express';
import Notification from '../models/Notification.model';
import SocketIO from 'socket.io';
import { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import httpStatus from 'http-status';
import { NotificationData } from '../interfaces';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import { createNotification } from './createNotification.service';

interface IProps {
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

export const createNotificationForAllManagersService = async ({
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
  const managerRole = await Role.findOne({
    where: {
      label: 'manager',
    },
    transaction,
  });
  const operatorRole = await Role.findOne({
    where: {
      label: 'operator',
    },
    transaction,
  });
  const userRoles = await UserRoles.findAll({
    where: {
      roleId: [managerRole.id, operatorRole.id],
    },
  });
  for (const userRole of userRoles) {
    const roleEntity = [managerRole, operatorRole].find(el => el.id === userRole.roleId);
    await createNotification({
      userId: userRole.userId,
      role: roleEntity.label,
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
    });
  }
};
