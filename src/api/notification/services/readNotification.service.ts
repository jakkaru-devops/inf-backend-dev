import { Response } from 'express';
import seq, { Transaction, literal } from 'sequelize';
import httpStatus from 'http-status';
import User from '../../user/models/User.model';
import UserRoles from '../../role/models/UserRoles.model';
import Notification from '../models/Notification.model';
import { APIError } from '../../../utils/api.utils';

interface IReadNotificationsProps {
  authUser: User;
  authUserRole: UserRoles;
  notificationIds?: Notification['id'][];
  res: Response;
  transaction: Transaction;
}

interface IResult {
  updatedNotifications: Notification[];
}

export const readNotificationsService = async ({
  authUser,
  authUserRole,
  notificationIds,
  res,
  transaction,
}: IReadNotificationsProps): Promise<IResult> => {
  try {
    const where: seq.WhereOptions = {
      userId: authUser.id,
      roleId: authUserRole.roleId,
      viewedAt: null,
    };

    if (notificationIds) {
      where.id = notificationIds;
    }

    const updatedNotifications = await Notification.update(
      {
        viewedAt: literal('CURRENT_TIMESTAMP'),
      },
      {
        where,
        transaction,
      },
    );

    return {
      updatedNotifications: updatedNotifications[1] || [],
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при прочтении уведомлений',
      error: err,
    });
  }
};
