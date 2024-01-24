import { Response } from 'express';
import Notification from '../models/Notification.model';
import SocketIO from 'socket.io';
import { Transaction } from 'sequelize';
import User from '../../user/models/User.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import Order from '../../order/models/Order.model';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import { createOrderNotificationService } from './createOrderNotification.service';

interface ICreateOrderNotificationService {
  type: Notification['type'];
  autoread: boolean;
  orderRequest: OrderRequest;
  order?: Order;
  seller?: User;
  customer?: User;
  io: SocketIO.Server;
  res?: Response;
  transaction?: Transaction;
}

export const createOrderNotificationForAllManagersService = async ({
  type,
  autoread,
  orderRequest,
  order,
  seller,
  customer,
  io,
  transaction,
}: ICreateOrderNotificationService) => {
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
    await createOrderNotificationService({
      userId: userRole.userId,
      role: roleEntity.label,
      type,
      autoread,
      orderRequest,
      order,
      seller,
      customer,
      io,
      transaction,
    });
  }
};
