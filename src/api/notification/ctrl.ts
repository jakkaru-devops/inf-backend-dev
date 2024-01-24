import SocketIO from 'socket.io';
import { Request, Response } from 'express';
import { executeTransaction } from '../../utils/transactions.utils';
import User from '../user/models/User.model';
import { APIError, APIResponse } from '../../utils/api.utils';
import httpStatus from 'http-status';
import UserRoles from '../role/models/UserRoles.model';
import { getNotificationListService } from './services/getNotificationList.service';
import { getUnreadNotificationsCountService } from './services/getUnreadNotificationsCount.service';
import { readNotificationsService } from './services/readNotification.service';
import Notification from './models/Notification.model';

class NotificationCtrl {
  io: SocketIO.Server;

  constructor(io: SocketIO.Server) {
    this.io = io;
  }

  /**
   * @desc      Get notification list
   * @route     GET /notification/list
   * @query     ? limit? & offset?
   * @success 	{ rows: Notification[], count: number }
   * @access    Private
   */
  getNotificationList = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;

      const { notificationList } = await getNotificationListService({
        authUser,
        authUserRole,
        req,
        res,
      });

      return APIResponse({
        res,
        data: notificationList,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Уведомления не загружены',
        error: err,
      });
    }
  };

  /**
   * @desc      Get total unread notifications count
   * @route     GET /notification/unread
   * @success 	number
   * @access    Private
   */
  getUnreadNotificationsCount = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;

        const { unreadNotificationsCount } = await getUnreadNotificationsCountService({
          res,
          authUser,
          authUserRole,
          transaction,
        });

        return APIResponse({
          res,
          data: unreadNotificationsCount,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при загрузке непрочитанных уведомлений',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Updated messages status in chat to read, send socket to client
   * @route     POST /notification/unread
   * @body      {
   *              notificationIds: string[],
   *            }
   * @success 	Message[]
   * @access    Private
   */
  readNotification = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;
        const notificationIds = req.body.notificationIds as string[];

        const { updatedNotifications } = await readNotificationsService({
          authUser,
          authUserRole,
          notificationIds,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: updatedNotifications,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при прочтении уведомлений',
          error: err,
        });
      }
    });
  };

  readAllNotifications = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;

        const notifications = await Notification.findAll({
          where: {
            userId: authUser.id,
            roleId: authUserRole.roleId,
            viewedAt: null,
          },
        });

        const { updatedNotifications } = await readNotificationsService({
          authUser,
          authUserRole,
          notificationIds: notifications.map(el => el.id),
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: updatedNotifications,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при прочтении всех уведомлений',
          error: err,
        });
      }
    });
  };
}

export default NotificationCtrl;
