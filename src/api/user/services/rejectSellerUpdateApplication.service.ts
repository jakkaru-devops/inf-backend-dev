import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction, Op } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import SocketIO from 'socket.io';
import { createNotification } from '../../notification/services/createNotification.service';
import Role from '../../role/models/Role.model';
import SellerUpdateApplication from '../models/SellerUpdateApplication.model';
import User from '../models/User.model';
import { ENotificationType } from '../../notification/interfaces';
import { getUserName } from '../../../utils/common.utils';

interface IProps {
  userId: string;
  rejectionMessage: string;
  io: SocketIO.Server;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  sellerUpdateApplication: SellerUpdateApplication;
}

export const rejectSellerUpdateApplicationService = async ({
  userId,
  rejectionMessage,
  io,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    let application = await SellerUpdateApplication.findOne({
      where: {
        userId,
        rejectedAt: null,
        confirmedAt: null,
      },
      order: [['createdAt', 'DESC']], // get the last application
    });
    if (!application) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Заявка не найдена',
      });
    }

    if (!rejectionMessage?.trim()?.length) {
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'Необходимо указать причину отказа',
      });
    }

    const userEntity = await User.findByPk(userId, {
      transaction,
    });

    application = await application.update(
      {
        rejectionMessage,
        rejectedAt: new Date(),
      },
      {
        transaction,
      },
    );

    await createNotification({
      userId: application.userId,
      role: 'seller',
      type: ENotificationType.sellerUpdateApplicationRejected,
      autoread: true,
      data: {
        rejectionMessage,
        seller: {
          id: userId,
          name: getUserName(userEntity),
        },
        applicationId: application.id,
      },
      io,
      res,
      transaction,
    });

    return {
      sellerUpdateApplication: application,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Заявка на обновление данных не была отклонена',
      error: err,
    });
  }
};
