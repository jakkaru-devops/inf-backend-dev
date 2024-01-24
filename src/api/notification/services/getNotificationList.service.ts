import { Request, Response } from 'express';
import User from '../../user/models/User.model';
import { Op, Transaction } from 'sequelize';
import httpStatus from 'http-status';
import UserRoles from '../../role/models/UserRoles.model';
import Notification from '../models/Notification.model';
import { ENotificationType } from '../interfaces';
import { APIError } from '../../../utils/api.utils';
import { getPaginationParams } from '../../../utils/common.utils';

interface IFetchChatListProps {
  authUser: User;
  authUserRole: UserRoles;
  limit?: string;
  offset?: string;
  search?: string;
  withMessages?: boolean;
  req: Request;
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  notificationList: { rows: Notification[]; count: number };
}

export const getNotificationListService = async ({
  authUser,
  authUserRole,
  req,
  res,
  transaction,
}: IFetchChatListProps): Promise<IResult> => {
  try {
    const notificationList = await Notification.findAndCountAll({
      ...getPaginationParams(req.query, 20),
      where: {
        userId: authUser.id,
        roleId: authUserRole.roleId,
        type: {
          [Op.ne]: ENotificationType.dummy,
        },
      },
      transaction,
      order: [['createdAt', 'DESC']],
    });

    notificationList.rows = notificationList.rows.map(item => item.toJSON() as Notification).reverse();

    return {
      notificationList,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при получении списка уведомлений',
      error: err,
    });
  }
};
